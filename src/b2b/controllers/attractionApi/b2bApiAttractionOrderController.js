const { Types } = require("mongoose");
const moment = require("moment");

const { sendErrorResponse } = require("../../../helpers");
const {
    attractionOrderCreateHelper,
    attractionOrderCompleteHelper,
} = require("../../helpers/attraction/b2bAttractionOrderHelper");
const { B2BAttractionOrder, B2BWallet, B2BTransaction } = require("../../models");
const { Country } = require("../../../models");
const createBookingTicketPdf = require("../../helpers/bookingTicketsHelper");
const createMultipleTicketPdf = require("../../helpers/multipleTicketHelper");
const {
    b2bApiAttractionOrderSchema,
} = require("../../validations/attractionApi/b2bApiAttractionOrder.schema");
const { generateUniqueString } = require("../../../utils");
const { deductAmountFromWallet, checkWalletBalance } = require("../../utils/wallet");
const { B2BAttractionOrderPayment } = require("../../models/attraction");

module.exports = {
    createB2bApiAttractionOrder: async (req, res) => {
        try {
            const processTimeStart = Date.now();
            const { countryCode, name, email, phoneNumber, agentReferenceNumber } = req.body;

            const { error } = b2bApiAttractionOrderSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const countryDetail = await Country.findOne({
                isocode: countryCode?.toUpperCase(),
                isDeleted: false,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 400, "country not found");
            }

            const exAttractionOrder = await B2BAttractionOrder.findOne({
                agentReferenceNumber: agentReferenceNumber?.toLowerCase(),
                reseller: req.reseller?._id,
            });
            if (exAttractionOrder) {
                return sendErrorResponse(
                    res,
                    400,
                    "already an attraction order exists with this reference number"
                );
            }

            let referenceNumber = generateUniqueString("B2BATO");

            let response;
            try {
                response = await attractionOrderCreateHelper({
                    ...req.body,
                    referenceNumber,
                    reseller: req.reseller,
                });
            } catch (err) {
                return sendErrorResponse(res, 400, err);
            }

            let wallet = await B2BWallet.findOne({
                reseller: req.reseller?._id,
            });
            const balanceAvailable = checkWalletBalance(wallet, response?.totalAmount);
            if (!balanceAvailable) {
                return sendErrorResponse(
                    res,
                    400,
                    "Insufficient balance. please reacharge and try again"
                );
            }

            const attractionOrder = new B2BAttractionOrder({
                activities: response?.selectedActivities,
                totalAmount: response?.totalAmount,
                reseller: req.reseller?._id,
                country: countryDetail?._id,
                name,
                email,
                phoneNumber,
                orderStatus: "pending",
                paymentState: "non-paid",
                orderedBy: req.reseller.role,
                agentReferenceNumber,
                referenceNumber,
                orderType: "b2b-api",
            });
            await attractionOrder.save();

            res.status(200).json({
                auditData: {
                    processTime: Date.now() - processTimeStart,
                    timestamp: new Date().toISOString(),
                },
                referenceNumber: attractionOrder?.referenceNumber,
                agentReferenceNumber: attractionOrder?.agentReferenceNumber,
                passengerDetails: {
                    name: attractionOrder?.name,
                    email: attractionOrder?.email,
                    phoneNumber: attractionOrder?.phoneNumber,
                },
                totalAmount: attractionOrder?.totalAmount,
                currency: "AED",
                orderStatus: attractionOrder?.orderStatus,
                paymentState: attractionOrder?.paymentState,
                activities: attractionOrder?.activities?.map((item) => {
                    return {
                        orderItemId: item?._id,
                        activityId: item?.activity,
                        bookingType: item?.bookingType,
                        activityType: item?.activityType,
                        date: moment(item?.date).format("YYYY-MM-DD"),
                        adultsCount: item?.adultsCount,
                        childrenCount: item?.childrenCount,
                        infantCount: item?.infantCount,
                        hoursCount: item?.hoursCount,
                        transferType: item?.transferType,
                        startTime: item?.startTime,
                        endTime: item?.endTime,
                        status: item?.status,
                        grandTotal: item?.grandTotal,
                        currency: "AED",
                    };
                }),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    completeB2bApiAttractionOrder: async (req, res) => {
        try {
            const processTimeStart = Date.now();
            const { referenceNumber } = req.params;

            const attractionOrder = await B2BAttractionOrder.findOne({
                referenceNumber,
                reseller: req.reseller._id,
            }).populate({
                path: "activities.activity",
                populate: {
                    path: "attraction",
                    populate: {
                        path: "destination",
                    },
                },
            });

            if (!attractionOrder) {
                return sendErrorResponse(res, 400, "attraction order not found");
            }

            if (
                attractionOrder.orderStatus === "completed" ||
                attractionOrder.paymentState === "fully-paid"
            ) {
                return sendErrorResponse(res, 400, "sorry, you have already completed this order!");
            }

            let totalAmount = attractionOrder.totalAmount;

            let wallet = await B2BWallet.findOne({ reseller: req.reseller?._id });
            const balanceAvailable = checkWalletBalance(wallet, totalAmount);
            if (!balanceAvailable) {
                // let reseller = req.reseller;
                // sendInsufficentBalanceMail(reseller);
                return sendErrorResponse(
                    res,
                    400,
                    "insufficient balance. please reacharge and try again"
                );
            }

            const attractionPayment = await B2BAttractionOrderPayment({
                amount: totalAmount,
                orderId: attractionOrder?._id,
                paymentState: "pending",
                paymentStateMessage: "",
                paymentMethod: "wallet",
                resellerId: req.reseller?._id,
            });
            await attractionPayment.save();

            // deducting amount from wallet
            try {
                deductAmountFromWallet(wallet, totalAmount);
            } catch (err) {
                attractionPayment.paymentState = "failed";
                await attractionPayment.save();

                return sendErrorResponse(res, 400, "wallet deduction failed, please try again");
            }

            attractionPayment.paymentState = "success";
            await attractionPayment.save();

            await B2BTransaction.create({
                reseller: req.reseller?._id,
                paymentProcessor: "wallet",
                product: "attraction",
                processId: attractionOrder?._id,
                description: `Attraction booking payment`,
                debitAmount: totalAmount,
                creditAmount: 0,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "Attraction booking payment",
                dateTime: new Date(),
            });

            try {
                await attractionOrderCompleteHelper({ attractionOrder });
            } catch (err) {
                return sendErrorResponse(res, 400, err);
            }

            // let reseller = req.reseller;
            // sendWalletDeductMail(reseller, attractionOrder);

            attractionOrder.orderStatus = "completed";
            attractionOrder.paymentState = "fully-paid";
            await attractionOrder.save();

            // sendAttractionOrderEmail(req.reseller, attractionOrder);
            // sendAttractionOrderAdminEmail(attractionOrder);

            res.status(200).json({
                auditData: {
                    processTime: Date.now() - processTimeStart,
                    timestamp: new Date().toISOString(),
                },
                message: "order successfully placed",
                referenceNumber: attractionOrder.referenceNumber,
                agentReferenceNumber: attractionOrder?.agentReferenceNumber,
                passengerDetails: {
                    name: attractionOrder?.name,
                    email: attractionOrder?.email,
                    phoneNumber: attractionOrder?.phoneNumber,
                },
                totalAmount: attractionOrder?.totalAmount,
                currency: "AED",
                orderStatus: attractionOrder?.orderStatus,
                paymentState: attractionOrder?.paymentState,
                activities: attractionOrder?.activities?.map((item) => {
                    return {
                        orderItemId: item?._id,
                        activityId: item?.activity?._id,
                        bookingType: item?.bookingType,
                        activityType: item?.activityType,
                        date: moment(item?.date).format("YYYY-MM-DD"),
                        adultsCount: item?.adultsCount,
                        childrenCount: item?.childrenCount,
                        infantCount: item?.infantCount,
                        hoursCount: item?.hoursCount,
                        transferType: item?.transferType,
                        startTime: item?.startTime,
                        endTime: item?.endTime,
                        bookingConfirmationNumber: item?.bookingConfirmationNumber,
                        adultTickets: item?.adultTickets
                            ? item?.adultTickets?.map((ticket) => {
                                  return {
                                      ticketNo: ticket?.ticketNo,
                                      lotNo: ticket?.lotNo,
                                      ticketFor: ticket?.ticketFor,
                                  };
                              })
                            : [],
                        childTickets: item?.childTickets
                            ? item?.childTickets?.map((ticket) => {
                                  return {
                                      ticketNo: ticket?.ticketNo,
                                      lotNo: ticket?.lotNo,
                                      ticketFor: ticket?.ticketFor,
                                  };
                              })
                            : [],
                        infantTickets: item?.infantTickets
                            ? item?.infantTickets?.map((ticket) => {
                                  return {
                                      ticketNo: ticket?.ticketNo,
                                      lotNo: ticket?.lotNo,
                                      ticketFor: ticket?.ticketFor,
                                  };
                              })
                            : [],
                        status: item?.status,
                        grandTotal: item?.grandTotal,
                        currency: "AED",
                    };
                }),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllB2bApiAttractionOrders: async (req, res) => {
        try {
            const processTimeStart = Date.now();
            const { skip = 0, limit = 10 } = req.query;

            const attractionOrders = await B2BAttractionOrder.aggregate([
                { $match: { reseller: Types.ObjectId(req.reseller?._id), orderType: "b2b-api" } },
                { $sort: { createdAt: -1 } },
                {
                    $skip: Number(limit) * Number(skip),
                },
                {
                    $limit: Number(limit),
                },
                { $unwind: "$activities" },
                {
                    $lookup: {
                        from: "attractionactivities",
                        localField: "activities.activity",
                        foreignField: "_id",
                        as: "activities.activity",
                        pipeline: [{ $project: { name: 1 } }],
                    },
                },
                {
                    $lookup: {
                        from: "attractions",
                        localField: "activities.attraction",
                        foreignField: "_id",
                        as: "activities.attraction",
                        pipeline: [{ $project: { code: 1 } }],
                    },
                },
                {
                    $set: {
                        "activities.attraction": { $arrayElemAt: ["$activities.attraction", 0] },
                        "activities.activity": { $arrayElemAt: ["$activities.activity", 0] },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        referenceNumber: 1,
                        agentReferenceNumber: 1,
                        passengerDetails: {
                            name: "$name",
                            email: "$email",
                            phoneNumber: "$phoneNumber",
                        },
                        totalAmount: 1,
                        currency: "AED",
                        orderStatus: 1,
                        paymentState: 1,
                        activities: {
                            orderItemId: "$_id",
                            activityId: "$activities.activity._id",
                            activityName: "$activities.activity.name",
                            attraction: "$activities.attraction.code",
                            bookingType: 1,
                            activityType: 1,
                            date: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$activities.date",
                                },
                            },
                            adultsCount: 1,
                            childrenCount: 1,
                            infantCount: 1,
                            hoursCount: 1,
                            transferType: 1,
                            adultTickets: {
                                ticketNo: 1,
                                lotNo: 1,
                                ticketFor: 1,
                            },
                            childTickets: {
                                ticketNo: 1,
                                lotNo: 1,
                                ticketFor: 1,
                            },
                            infantTickets: {
                                ticketNo: 1,
                                lotNo: 1,
                                ticketFor: 1,
                            },
                            status: 1,
                            grandTotal: 1,
                            currency: "AED",
                        },
                    },
                },
                {
                    $group: {
                        _id: "$_id",
                        referenceNumber: { $first: "$referenceNumber" },
                        agentReferenceNumber: { $first: "$agentReferenceNumber" },
                        passengerDetails: { $first: "$passengerDetails" },
                        totalAmount: { $first: "$totalAmount" },
                        currency: { $first: "$currency" },
                        orderStatus: { $first: "$orderStatus" },
                        paymentState: { $first: "$paymentState" },
                        activities: { $push: "$activities" },
                    },
                },
                {
                    $unset: "_id",
                },
            ]);

            const totalAttractionOrders = await B2BAttractionOrder.find({
                reseller: req.reseller?._id,
                orderType: "b2b-api",
            }).count();

            res.status(200).json({
                auditData: {
                    processTime: Date.now() - processTimeStart,
                    timestamp: new Date().toISOString(),
                },
                totalAttractionOrders,
                skip: Number(skip),
                limit: Number(limit),
                attractionOrders,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleB2bApiAttractionOrder: async (req, res) => {
        try {
            const processTimeStart = Date.now();
            const { referenceNumber } = req.params;

            const attractionOrder = await B2BAttractionOrder.aggregate([
                { $match: { referenceNumber, reseller: Types.ObjectId(req.reseller?._id) } },
                { $unwind: "$activities" },
                {
                    $lookup: {
                        from: "attractionactivities",
                        localField: "activities.activity",
                        foreignField: "_id",
                        as: "activities.activity",
                        pipeline: [{ $project: { name: 1 } }],
                    },
                },
                {
                    $lookup: {
                        from: "attractions",
                        localField: "activities.attraction",
                        foreignField: "_id",
                        as: "activities.attraction",
                        pipeline: [{ $project: { code: 1 } }],
                    },
                },
                {
                    $set: {
                        "activities.attraction": { $arrayElemAt: ["$activities.attraction", 0] },
                        "activities.activity": { $arrayElemAt: ["$activities.activity", 0] },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        referenceNumber: 1,
                        agentReferenceNumber: 1,
                        passengerDetails: {
                            name: "$name",
                            email: "$email",
                            phoneNumber: "$phoneNumber",
                        },
                        totalAmount: 1,
                        currency: "AED",
                        orderStatus: 1,
                        paymentState: 1,
                        activities: {
                            orderItemId: "$_id",
                            activityId: "$activities.activity._id",
                            activityName: "$activities.activity.name",
                            attraction: "$activities.attraction.code",
                            bookingType: 1,
                            activityType: 1,
                            date: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$activities.date",
                                },
                            },
                            adultsCount: 1,
                            childrenCount: 1,
                            infantCount: 1,
                            hoursCount: 1,
                            transferType: 1,
                            adultTickets: {
                                ticketNo: 1,
                                lotNo: 1,
                                ticketFor: 1,
                            },
                            childTickets: {
                                ticketNo: 1,
                                lotNo: 1,
                                ticketFor: 1,
                            },
                            infantTickets: {
                                ticketNo: 1,
                                lotNo: 1,
                                ticketFor: 1,
                            },
                            status: 1,
                            grandTotal: 1,
                            currency: "AED",
                        },
                    },
                },
                {
                    $group: {
                        _id: "$_id",
                        referenceNumber: { $first: "$referenceNumber" },
                        agentReferenceNumber: { $first: "$agentReferenceNumber" },
                        passengerDetails: { $first: "$passengerDetails" },
                        totalAmount: { $first: "$totalAmount" },
                        currency: { $first: "$currency" },
                        orderStatus: { $first: "$orderStatus" },
                        paymentState: { $first: "$paymentState" },
                        activities: { $push: "$activities" },
                    },
                },
                {
                    $unset: "_id",
                },
            ]);

            if (!attractionOrder || attractionOrder?.length < 1) {
                return sendErrorResponse(res, 400, "attraction order not found");
            }

            res.status(200).json({
                auditData: {
                    processTime: Date.now() - processTimeStart,
                    timestamp: new Date().toISOString(),
                },
                attractionOrder: attractionOrder[0],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadB2bApiAttractionSingleOrderItemTickets: async (req, res) => {
        try {
            const { referenceNumber, orderItemId } = req.params;

            const orderDetails = await B2BAttractionOrder.aggregate([
                {
                    $match: {
                        referenceNumber,
                        orderStatus: "completed",
                        activities: {
                            $elemMatch: { _id: Types.ObjectId(orderItemId) },
                        },
                    },
                },
                { $unwind: "$activities" },
                {
                    $match: {
                        "activities._id": Types.ObjectId(orderItemId),
                    },
                },
                {
                    $lookup: {
                        from: "attractionactivities",
                        localField: "activities.activity",
                        foreignField: "_id",
                        as: "activities.activity",
                    },
                },
                {
                    $lookup: {
                        from: "attractions",
                        localField: "activities.attraction",
                        foreignField: "_id",
                        as: "activities.attraction",
                    },
                },
                {
                    $lookup: {
                        from: "destinations",
                        localField: "activities.attraction.destination",
                        foreignField: "_id",
                        as: "activities.destination",
                    },
                },
                {
                    $set: {
                        "activities.destination": {
                            $arrayElemAt: ["$activities.destination", 0],
                        },
                        "activities.activity": {
                            $arrayElemAt: ["$activities.activity", 0],
                        },
                        "activities.attraction": {
                            $arrayElemAt: ["$activities.attraction", 0],
                        },
                    },
                },
                {
                    $project: {
                        activities: {
                            activity: {
                                name: 1,
                                description: 1,
                            },
                            attraction: {
                                title: 1,
                                logo: 1,
                                images: 1,
                                _id: 1,
                            },
                            destination: {
                                name: 1,
                            },
                            _id: 1,
                            voucherNumber: 1,
                            startTime: 1,
                            bookingConfirmationNumber: 1,
                            note: 1,
                            adultTickets: 1,
                            childTickets: 1,
                            infantTickets: 1,
                            status: 1,
                            amount: 1,
                            offerAmount: 1,
                            transferType: 1,
                            adultsCount: 1,
                            childrenCount: 1,
                            infantCount: 1,
                            date: 1,
                            bookingType: 1,
                        },
                    },
                },
            ]);
            if (orderDetails.length < 1 || orderDetails?.activities?.length < 1)
                return sendErrorResponse(res, 400, "order not found");

            if (orderDetails[0]?.activities?.bookingType === "booking") {
                if (!orderDetails[0]?.activities?.bookingConfirmationNumber) {
                    return sendErrorResponse(res, 400, "this order not confirmed");
                }

                const pdfBuffer = await createBookingTicketPdf(orderDetails[0].activities);

                res.set({
                    "Content-Type": "application/pdf",

                    "Content-Disposition": "attachment; filename=tickets.pdf",
                });
                res.send(pdfBuffer);
            } else {
                const pdfBuffer = await createMultipleTicketPdf(orderDetails[0].activities);

                res.set({
                    "Content-Type": "application/pdf",

                    "Content-Disposition": "attachment; filename=tickets.pdf",
                });
                res.send(pdfBuffer);
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    // cancelAttractionApiOrder: async (req, res) => {
    //     try {
    //         const { orderId, orderItemId } = req.body;

    //         if (!isValidObjectId(orderId)) {
    //             return sendErrorResponse(res, 400, "invalid order id");
    //         }

    //         if (!isValidObjectId(orderItemId)) {
    //             return sendErrorResponse(res, 400, "invalid order item id");
    //         }

    //         // check order available or not
    //         const order = await B2BAttractionOrder.findOne(
    //             {
    //                 _id: orderId,
    //                 reseller: req.reseller?._id,
    //             },
    //             { activities: { $elemMatch: { _id: orderItemId } } }
    //         );

    //         if (!order || order?.activities?.length < 1) {
    //             return sendErrorResponse(res, 400, "order not found");
    //         }

    //         const attraction = await Attraction.findById(order.activities[0].attraction);
    //         if (!attraction) {
    //             return sendErrorResponse(res, 400, "attraction not found");
    //         }

    //         // check if it's status is booked or confirmed
    //         if (
    //             order.activities[0].status !== "booked" &&
    //             order.activities[0].status !== "confirmed"
    //         ) {
    //             return sendErrorResponse(
    //                 res,
    //                 400,
    //                 "you can't cancel this order. order already cancelled or not completed the order"
    //             );
    //         }

    //         // check if it's ok for cancelling with cancellation policy
    //         if (attraction.cancellationType === "nonRefundable") {
    //             return sendErrorResponse(res, 400, "sorry, this order is non refundable");
    //         }

    //         if (
    //             new Date(order.activities[0].date).setHours(0, 0, 0, 0) <=
    //             new Date().setDate(0, 0, 0, 0)
    //         ) {
    //             return sendErrorResponse(
    //                 res,
    //                 400,
    //                 "sorry, you cann't cancel the order after the activity date"
    //             );
    //         }

    //         let orderAmount = order.activities[0]?.grandTotal;
    //         let cancellationFee = 0;
    //         let cancelBeforeDate = new Date(
    //             new Date(order.activities[0].date).setHours(0, 0, 0, 0)
    //         );
    //         cancelBeforeDate.setHours(cancelBeforeDate.getHours() - attraction.cancelBeforeTime);

    //         if (attraction.cancellationType === "freeCancellation") {
    //             if (new Date().setHours(0, 0, 0, 0) < cancelBeforeDate) {
    //                 cancellationFee = 0;
    //             } else {
    //                 cancellationFee = (orderAmount / 100) * attraction.cancellationFee;
    //             }
    //         } else if (attraction.cancellationType === "cancelWithFee") {
    //             if (new Date().setHours(0, 0, 0, 0) < cancelBeforeDate) {
    //                 cancellationFee = (orderAmount / 100) * attraction.cancellationFee;
    //             } else {
    //                 cancellationFee = totalAmount;
    //             }
    //         } else {
    //             return sendErrorResponse(res, 400, "sorry, cancellation failed");
    //         }

    //         // Update tickets state to back
    //         if (order.activities[0].bookingType === "ticket") {
    //             await AttractionTicket.find({
    //                 activity: order.activities[0].activity,
    //                 ticketNo: order.activities[0].adultTickets,
    //             }).updateMany({ status: "ok" });
    //             await AttractionTicket.find({
    //                 activity: order.activities[0].activity,
    //                 ticketNo: order.activities[0].childTickets,
    //             }).updateMany({ status: "ok" });
    //             await AttractionTicket.find({
    //                 activity: order.activities[0].activity,
    //                 ticketNo: order.activities[0].infantTickets,
    //             }).updateMany({ status: "ok" });
    //         }

    //         if (
    //             attraction.isApiConnected === true &&
    //             attraction.connectedApi == "63f0a47b479d4a0376fe12f4"
    //         ) {
    //             const response = await cancelBooking(order.activities[0].bookingConfirmationNumber);
    //             console.log(response, "this is response for cancel burj khalifa");
    //         }

    //         // Refund the order amount after substracting fee
    //         let wallet = await B2BWallet.findOne({
    //             reseller: req.reseller?._id,
    //         });
    //         if (!wallet) {
    //             wallet = new B2BWallet({
    //                 balance: 0,
    //                 reseller: req.reseller?._id,
    //             });
    //             await wallet.save();
    //         }

    //         console.log(order, "orders");
    //         console.log(wallet, "wallets");
    //         console.log(attraction, "attractions");

    //         // const newTransaction = new B2BTransaction({
    //         //     amount: orderAmount - cancellationFee,
    //         //     reseller: req.reseller?._id,
    //         //     transactionType: "refund",
    //         //     paymentProcessor: "wallet",
    //         //     order: orderId,
    //         //     orderItem: orderItemId,
    //         //     status: "pending",
    //         //     product:"attraction"
    //         // });
    //         // await newTransaction.save();

    //         // newTransaction.status = "success";
    //         // await newTransaction.save();

    //         // await B2BTransaction.find({
    //         //     transactionType: "markup",
    //         //     order: orderId,
    //         //     orderItem: orderItemId,
    //         //     status: "pending",
    //         // }).updateMany({ status: "failed" });

    //         const cancelStatus = await B2BAttractionOrderCancellation.findOne({
    //             reseller: req.reseller?._id,
    //             order: orderId,
    //             orderItem: orderItemId,
    //         });

    //         if (cancelStatus && cancelStatus.status === "cancelled") {
    //             return sendErrorResponse(
    //                 res,
    //                 400,
    //                 "you can't cancel this order. order already cancelled"
    //             );
    //         }

    //         const newCancellation = new B2BAttractionOrderCancellation({
    //             reseller: req.reseller?._id,
    //             amount: orderAmount - cancellationFee,
    //             paymentProcessor: "wallet",
    //             order: orderId,
    //             orderItem: orderItemId,
    //         });

    //         newCancellation.status = "cancelled";
    //         await newCancellation.save();

    //         wallet.balance += orderAmount - cancellationFee;
    //         await wallet.save();

    //         await newCancellation.save();

    //         await B2BAttractionOrder.findOneAndUpdate(
    //             {
    //                 _id: orderId,
    //                 "activities._id": orderItemId,
    //             },
    //             {
    //                 "activities.$.status": "cancelled",
    //             },
    //             { runValidators: true }
    //         );

    //         res.status(200).json({
    //             message: "you have successfully cancelled the order",
    //         });
    //     } catch (err) {
    //         console.log(err);
    //         sendErrorResponse(res, 500, err);
    //     }
    // },
};
