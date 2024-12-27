const { isValidObjectId, Types } = require("mongoose");
const nodeCCAvenue = require("node-ccavenue");

const { b2bAttractionOrderSchema } = require("../../validations/b2bAttractionOrder.schema");
const { sendErrorResponse } = require("../../../helpers");
const {
    Attraction,
    Country,
    AttractionTicket,
    AttractionTicketSetting,
} = require("../../../models");
const {
    B2BAttractionOrder,
    B2BWallet,
    B2BTransaction,
    B2BAttractionOrderCancellation,
} = require("../../models");
const { generateUniqueString, ccavenueFormHandler, tabbyFormHandler } = require("../../../utils");
const { getB2bOrders, generateB2bOrdersSheet } = require("../../helpers/b2bOrdersHelper");
const sendAttractionOrderEmail = require("../../helpers/sendAttractionOrderEmail");
const sendAttractionOrderAdminEmail = require("../../helpers/sendAttractionOrderAdminEmail");
const sendInsufficentBalanceMail = require("../../helpers/sendInsufficentBalanceEmail");
const sendWalletDeductMail = require("../../helpers/sendWalletDeductMail");
const {
    getTicketType,
    saveTicket,
    confirmTicket,
    orderDetails,
    generateBookingPdf,
    cancelBooking,
    testCredit,
    getTimeSlots,
    orderDetailsBooking,
} = require("../../helpers");
const createMultipleTicketPdf = require("../../helpers/multipleTicketHelper");
const createSingleTicketPdf = require("../../helpers/singleTicketPdf");
const createBookingTicketPdf = require("../../helpers/bookingTicketsHelper");
const { checkWalletBalance, deductAmountFromWallet } = require("../../utils/wallet");

const {
    attractionOrderCreateHelper,
    attractionOrderCompleteHelper,
} = require("../../helpers/attraction/b2bAttractionOrderHelper");
const { B2BAttractionOrderPayment } = require("../../models/attraction");
const b2bAttractionOrderInvoice = require("../../helpers/attraction/b2bAttractionOrderInvoice");
const createBookingTicketPdfTheme2 = require("../../helpers/attraction/styles/createBookingTicketPdfTheme2");
const createMultipleTicketPdfTheme2 = require("../../helpers/attraction/createMultipleTicketTheme2");
const createSingleTicketTheme2Pdf = require("../../helpers/attraction/styles/createSingleTicketTheme2");
const createMultipleTicketPdfTheme3 = require("../../helpers/attraction/createMultipleTicketTheme3");
const createBookingPdfTheme3 = require("../../helpers/attraction/styles/createBookingPdfTheme3");
const createSingleTicketTheme3Pdf = require("../../helpers/attraction/styles/createSingleTIcketTheme3");
const {
    whatsappTicketSenderHelper,
} = require("../../helpers/attraction/b2bAttractionWhatsappHelper");
const {
    attractionPdfBufferHelper,
    b2bAttractionPdfBufferHelper,
} = require("../../helpers/attraction/b2bAttractionTicketHelper");

const ccav = new nodeCCAvenue.Configure({
    merchant_id: process.env.CCAVENUE_MERCHANT_ID,
    working_key: process.env.CCAVENUE_WORKING_KEY,
});

module.exports = {
    createAttractionOrder: async (req, res) => {
        try {
            const { name, email, country, phoneNumber, agentReferenceNumber, paymentMethod } =
                req.body;

            const { error } = b2bAttractionOrderSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({
                _id: country,
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
            if (paymentMethod === "wallet") {
                const balanceAvailable = checkWalletBalance(wallet, response?.totalAmount);
                if (!balanceAvailable) {
                    return sendErrorResponse(
                        res,
                        400,
                        "Insufficient balance. please reacharge and try again"
                    );
                }
            }

            const attractionOrder = new B2BAttractionOrder({
                activities: response?.selectedActivities,
                totalAmount: response?.totalAmount,
                reseller: req.reseller?._id,
                country,
                name,
                email,
                phoneNumber,
                orderStatus: "pending",
                paymentState: "non-paid",
                orderedBy: req.reseller.role,
                agentReferenceNumber,
                referenceNumber,
                orderType: "b2b-portal",
                otp: 12345,
                // otp: sendOtpEmail({
                //     agentName: req.reseller?.name,
                //     email: req.reseller?.email,
                //     product: "Attraction",
                //     referenceNumber,
                // }),
            });
            await attractionOrder.save();

            if (paymentMethod === "ccavenue") {
                const attractionOrderPayment = await B2BAttractionOrderPayment.create({
                    amount: response?.totalAmount,
                    orderId: attractionOrder?._id,
                    paymentState: "pending",
                    resellerId: req.reseller?._id,
                    paymentMethod: "ccavenue",
                    paymentStateMessage: "",
                });
                return ccavenueFormHandler({
                    res,
                    totalAmount: response?.totalAmount,
                    redirectUrl: `${process.env.SERVER_URL}/api/v1/b2b/attractions/orders/ccavenue/capture`,
                    cancelUrl: `${process.env.SERVER_URL}/api/v1/b2b/attractions/orders/ccavenue/capture`,
                    orderId: attractionOrderPayment?._id,
                });
            }

            if (paymentMethod === "tabby") {
                return await tabbyFormHandler({
                    res,
                    totalAmount: response?.totalAmount,
                    resellerId: req.reseller?._id,
                    agentReferenceNumber,
                    data: req.body,
                    name,
                    email,
                    country,
                    phoneNumber,
                    orderId: attractionOrder?._id,
                });
            }

            res.status(200).json({
                message: "Order successfully created",
                _id: attractionOrder?._id,
                referenceNumber,
                totalAmount: attractionOrder?.totalAmount,
                currency: "AED",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    completeAttractionOrder: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { otp } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "Invalid order id");
            }
            const attractionOrder = await B2BAttractionOrder.findOne({
                _id: orderId,
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

            if (!attractionOrder.otp || attractionOrder.otp !== Number(otp)) {
                return sendErrorResponse(res, 400, "incorrect otp!");
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

            attractionOrder.otp = "";
            attractionOrder.orderStatus = "completed";
            attractionOrder.paymentState = "fully-paid";
            await attractionOrder.save();
            whatsappTicketSenderHelper({ attractionOrder });

            // sendAttractionOrderEmail(req.reseller, attractionOrder);
            // sendAttractionOrderAdminEmail(attractionOrder);

            res.status(200).json({
                message: "order successfully placed",
                referenceNumber: attractionOrder.referenceNumber,
                _id: attractionOrder?._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    completeB2bAttractionOrderWithTabby: async (req, res) => {
        try {
            const { orderId } = req.params;

            const { order } = req.body;

            if (!isValidObjectId(order?.reference_id)) {
                return sendErrorResponse(res, 400, "Invalid order id");
            }
            const attractionOrder = await B2BAttractionOrder.findOne({
                _id: order?.reference_id,
                // reseller: req.reseller._id,
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

            let wallet = await B2BWallet.findOne({ reseller: attractionOrder?.reseller });
            const balanceAvailable = checkWalletBalance(wallet, totalAmount);
            // if (!balanceAvailable) {
            //     // let reseller = req.reseller;
            //     // sendInsufficentBalanceMail(reseller);
            //     return sendErrorResponse(
            //         res,
            //         400,
            //         "insufficient balance. please reacharge and try again"
            //     );
            // }

            const attractionPayment = await B2BAttractionOrderPayment({
                amount: totalAmount,
                orderId: attractionOrder?._id,
                paymentState: "pending",
                paymentStateMessage: "",
                paymentMethod: "tabby",
                resellerId: attractionOrder?.reseller,
            });
            await attractionPayment.save();

            // deducting amount from wallet
            // try {
            //     deductAmountFromWallet(wallet, totalAmount);
            // } catch (err) {
            //     attractionPayment.paymentState = "failed";
            //     await attractionPayment.save();

            //     return sendErrorResponse(res, 400, "wallet deduction failed, please try again");
            // }

            attractionPayment.paymentState = "success";
            await attractionPayment.save();

            await B2BTransaction.create({
                reseller: attractionOrder?.reseller,
                paymentProcessor: "tabby",
                product: "attraction",
                processId: attractionOrder?._id,
                description: `Attraction order payment`,
                debitAmount: 0,
                creditAmount: 0,
                directAmount: attractionOrder.totalAmount,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "Attraction order payment",
                dateTime: new Date(),
            });

            try {
                await attractionOrderCompleteHelper({ attractionOrder });
            } catch (err) {
                console.log(err);
                return sendErrorResponse(res, 400, err);
            }

            // let reseller = req.reseller;
            // sendWalletDeductMail(reseller, attractionOrder, attractionOrder.totalAmount);

            attractionOrder.otp = "";
            attractionOrder.orderStatus = "completed";
            attractionOrder.paymentState = "fully-paid";
            await attractionOrder.save();

            // sendAttractionOrderEmail(req.reseller, attractionOrder);
            // sendAttractionOrderAdminEmail(attractionOrder);

            res.status(200).json({
                message: "order successfully placed",
                referenceNumber: attractionOrder.referenceNumber,
                _id: attractionOrder?._id,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    completeB2bAttractionOrderWithCcavenue: async (req, res) => {
        try {
            const { encResp } = req.body;

            const decryptedJsonResponse = ccav.redirectResponseToJson(encResp);
            const { order_id, order_status } = decryptedJsonResponse;

            const attractionorderPayment = await B2BAttractionOrderPayment.findById(order_id);
            if (!attractionorderPayment) {
                return sendErrorResponse(
                    res,
                    400,
                    "Attraction order payment not found!. Please check with our team if amount is debited from your bank!"
                );
            }

            const attractionOrder = await B2BAttractionOrder.findById(
                attractionorderPayment.orderId
            ).populate({
                path: "activities.activity",
                populate: {
                    path: "attraction",
                    populate: {
                        path: "destination",
                    },
                },
            });
            if (!attractionOrder) {
                return sendErrorResponse(
                    res,
                    400,
                    "Attraction order not found!. Please check with our team if amount is debited from your bank!"
                );
            }

            if (attractionOrder.status !== "pending") {
                return sendErrorResponse(
                    res,
                    400,
                    "This order already completed. Check with our team if you paid multiple times."
                );
            }

            let wallet = await B2BWallet.findOne({ reseller: attractionOrder?.reseller });
            if (!wallet) {
                wallet = await B2BWallet.create({
                    balance: 0,
                    creditAmount: 0,
                    creditUsed: 0,
                    reseller: attractionOrder?.reseller,
                });
            }

            if (order_status !== "Success") {
                attractionorderPayment.status = "failed";
                await attractionorderPayment.save();

                res.writeHead(301, {
                    Location: `${process.env.B2B_WEB_URL}/attraction/invoice/error`,
                });
                res.end();
            } else {
                attractionorderPayment.status = "success";
                await attractionorderPayment.save();

                await B2BTransaction.create({
                    reseller: attractionOrder?.reseller,
                    paymentProcessor: "ccavenue",
                    product: "attraction",
                    processId: attractionOrder?._id,
                    description: `Attraction order payment`,
                    debitAmount: 0,
                    creditAmount: 0,
                    directAmount: attractionOrder.totalAmount,
                    closingBalance: wallet.balance,
                    dueAmount: wallet.creditUsed,
                    remark: "Attraction order payment",
                    dateTime: new Date(),
                });

                try {
                    await attractionOrderCompleteHelper({ attractionOrder });
                } catch (err) {
                    return sendErrorResponse(res, 400, err);
                }

                // let reseller = req.reseller;
                // sendWalletDeductMail(reseller, attractionOrder);

                attractionOrder.otp = "";
                attractionOrder.orderStatus = "completed";
                attractionOrder.paymentState = "fully-paid";
                await attractionOrder.save();

                // sendAttractionOrderEmail(req.reseller, attractionOrder);
                // sendAttractionOrderAdminEmail(attractionOrder);

                res.writeHead(301, {
                    Location: `${process.env.B2B_WEB_URL}/attractions/invoice/${attractionOrder?._id}`,
                });
                res.end();
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleB2bAllOrders: async (req, res) => {
        try {
            const { result, skip, limit } = await getB2bOrders({
                ...req.query,
                resellerId: req.reseller?._id,
                orderedBy: "",
                agentCode: "",
            });

            res.status(200).json({ result, skip, limit });
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleB2bAllOrdersSheet: async (req, res) => {
        try {
            await generateB2bOrdersSheet({
                ...req.query,
                res,
                resellerId: req.reseller?._id,
                orderedBy: "",
                agentCode: "",
                downloader: req.reseller?.role,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    cancelAttractionOrder: async (req, res) => {
        try {
            const { orderId, orderItemId } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            if (!isValidObjectId(orderItemId)) {
                return sendErrorResponse(res, 400, "invalid order item id");
            }

            // check order available or not
            const order = await B2BAttractionOrder.findOne(
                {
                    _id: orderId,
                    reseller: req.reseller?._id,
                },
                { activities: { $elemMatch: { _id: orderItemId } } }
            );

            if (!order || order?.activities?.length < 1) {
                return sendErrorResponse(res, 400, "order not found");
            }

            const attraction = await Attraction.findById(order.activities[0].attraction);
            if (!attraction) {
                return sendErrorResponse(res, 400, "attraction not found");
            }

            // check if it's status is booked or confirmed
            if (
                order.activities[0].status !== "booked" &&
                order.activities[0].status !== "confirmed"
            ) {
                return sendErrorResponse(
                    res,
                    400,
                    "you cann't canel this order. order already cancelled or not completed the order"
                );
            }

            // check if it's ok for cancelling with cancellation policy
            if (attraction.cancellationType === "nonRefundable") {
                return sendErrorResponse(res, 400, "sorry, this order is non refundable");
            }

            if (
                new Date(order.activities[0].date).setHours(0, 0, 0, 0) <=
                new Date().setDate(0, 0, 0, 0)
            ) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry, you cann't cancel the order after the activity date"
                );
            }

            let orderAmount = order.activities[0].grandTotal;
            let cancellationFee = 0;
            let cancelBeforeDate = new Date(
                new Date(order.activities[0].date).setHours(0, 0, 0, 0)
            );

            cancelBeforeDate.setHours(cancelBeforeDate.getHours() - attraction.cancelBeforeTime);

            if (attraction.cancellationType === "freeCancellation") {
                if (new Date().setHours(0, 0, 0, 0) < cancelBeforeDate) {
                    cancellationFee = 0;
                } else {
                    cancellationFee = (orderAmount / 100) * attraction.cancellationFee;
                }
            } else if (attraction.cancellationType === "cancelWithFee") {
                if (new Date().setHours(0, 0, 0, 0) < cancelBeforeDate) {
                    cancellationFee = (orderAmount / 100) * attraction.cancellationFee;
                } else {
                    return sendErrorResponse(
                        res,
                        400,
                        "sorry, cancellation time has been completed "
                    );

                    // cancellationFee = totalAmount;
                }
            } else {
                return sendErrorResponse(res, 400, "sorry, cancellation failed");
            }

            // Update tickets state to back
            if (order.activities[0].bookingType === "ticket") {
                await AttractionTicket.updateMany(
                    {
                        activity: order.activities[0].activity,
                        ticketNo: {
                            $in: order.activities[0].adultTickets.map((ticket) => ticket.ticketNo),
                        },
                    },
                    { $set: { status: "ok" } }
                );
                await AttractionTicket.updateMany(
                    {
                        activity: order.activities[0].activity,
                        ticketNo: {
                            $in: order.activities[0].childTickets.map((ticket) => ticket.ticketNo),
                        },
                    },
                    { $set: { status: "ok" } }
                );
                await AttractionTicket.updateMany(
                    {
                        activity: order.activities[0].activity,
                        ticketNo: {
                            $in: order.activities[0].infantTickets.map((ticket) => ticket.ticketNo),
                        },
                    },
                    { $set: { status: "ok" } }
                );

                // await AttractionTicket.find({
                //     activity: order.activities[0].activity,
                //     ticketNo: order.activities[0].childTickets,
                // }).updateMany({ status: "ok" });
                // await AttractionTicket.find({
                //     activity: order.activities[0].activity,
                //     ticketNo: order.activities[0].infantTickets,
                // }).updateMany({ status: "ok" });
            }

            if (
                attraction.isApiConnected === true &&
                attraction.connectedApi == "63f0a47b479d4a0376fe12f4"
            ) {
                const response = await cancelBooking(order.activities[0].bookingConfirmationNumber);
            }

            // Refund the order amount after substracting fee
            let wallet = await B2BWallet.findOne({
                reseller: req.reseller?._id,
            });
            if (!wallet) {
                wallet = new B2BWallet({
                    balance: 0,
                    reseller: req.reseller?._id,
                });
                await wallet.save();
            }

            let newTransaction = await B2BTransaction.create({
                reseller: req.reseller?._id,
                paymentProcessor: "wallet",
                product: "attraction",
                processId: orderId,
                description: `Attraction booking refund`,
                debitAmount: 0,
                creditAmount: orderAmount - cancellationFee,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "Attraction booking refund",
                dateTime: new Date(),
            });

            wallet.balance += newTransaction.creditAmount;
            await wallet.save();

            // cancel the order item's markup transactions
            // for reseller and sub-agaents
            // TODO:
            // upgrade this this markup setup
            // await B2BTransaction.find({
            //     transactionType: "markup",
            //     order: orderId,
            //     orderItem: orderItemId,
            //     status: "pending",
            // }).updateMany({ status: "failed" });

            await B2BAttractionOrder.findOneAndUpdate(
                {
                    _id: orderId,
                    "activities._id": orderItemId,
                },
                {
                    "activities.$.status": "cancelled",
                },
                { runValidators: true }
            );

            res.status(200).json({
                message: "successfully cancelled the order",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleAttractionOrder: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const order = await B2BAttractionOrder.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(orderId),
                        reseller: Types.ObjectId(req.reseller?._id),
                        orderStatus: "completed",
                    },
                },
                {
                    $lookup: {
                        from: "countries",
                        localField: "country",
                        foreignField: "_id",
                        as: "country",
                    },
                },
                { $unwind: "$activities" },
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
                    $set: {
                        "activities.activity": {
                            $arrayElemAt: ["$activities.activity", 0],
                        },
                        "activities.attraction": {
                            $arrayElemAt: ["$activities.attraction", 0],
                        },
                        country: {
                            $arrayElemAt: ["$country", 0],
                        },
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
                    },
                },
                {
                    $project: {
                        _id: 1,
                        referenceNumber: 1,
                        name: 1,
                        email: 1,
                        phoneNumber: 1,
                        orderStatus: 1,
                        totalAmount: 1,
                        totalOffer: 1,
                        country: 1,
                        activities: {
                            _id: 1,
                            bookingConfirmationNumber: 1,
                            note: 1,
                            adultTickets: 1,
                            childTickets: 1,
                            infantTickets: 1,
                            status: 1,
                            amount: 1,
                            offerAmount: 1,
                            adultActivityTotalPrice: 1,
                            childActivityTotalPrice: 1,
                            infantActivityTotalPrice: 1,
                            transferType: 1,
                            adultsCount: 1,
                            childrenCount: 1,
                            infantCount: 1,
                            date: 1,
                            bookingType: 1,
                            activity: {
                                name: 1,
                                description: 1,
                            },
                            attraction: {
                                _id: 1,
                                title: 1,
                                images: 1,
                                logo: 1,
                            },
                            destination: {
                                name: 1,
                            },
                            // grandTotal: 1,
                        },
                        createdAt: 1,
                    },
                },
                {
                    $group: {
                        _id: null,
                        id: { $first: "$_id" },
                        activites: { $push: "$activities" },
                        totalAmount: { $first: "$totalAmount" },
                        referenceNumber: { $first: "$referenceNumber" },
                        name: { $first: "$name" },
                        email: { $first: "$email" },
                        phoneNumber: { $first: "$phoneNumber" },
                        orderStatus: { $first: "$orderStatus" },
                        totalOffer: { $first: "$totalOffer" },
                        country: { $first: "$country" },
                        createdAt: { $first: "$createdAt" },
                    },
                },
            ]);

            console.log(order[0].activites);
            if (!order || order?.length < 1) {
                return sendErrorResponse(res, 404, "order not found");
            }

            res.status(200).json(order[0]);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    generateAttractionInvoicePdf: async (req, res) => {
        try {
            const { orderId } = req.params;

            const pdfBuffer = await b2bAttractionOrderInvoice({
                orderId,
                resellerId: req.reseller?._id,
            });

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=tickets.pdf",
            });
            res.send(pdfBuffer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAttractionOrderTickets: async (req, res) => {
        try {
            const { orderId, activityId } = req.params;

            const { pdfBuffer } = await b2bAttractionPdfBufferHelper({ orderId, activityId });
            res.set({
                "Content-Type": "application/pdf",

                "Content-Disposition": "attachment; filename=tickets.pdf",
            });
            res.send(pdfBuffer);
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    getAttractionOrderSingleTickets: async (req, res) => {
        try {
            const { orderId, activityId, ticketNo } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "invalid activity id");
            }

            console.log(orderId, activityId, ticketNo, "tickets");

            const orderDetails = await B2BAttractionOrder.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(orderId),
                        $or: [{ orderStatus: "completed" }, { orderStatus: "paid" }],
                    },
                },
                { $unwind: "$activities" },
                {
                    $match: {
                        "activities._id": Types.ObjectId(activityId),
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
                                termsAndConditions: 1,
                            },
                            attraction: {
                                title: 1,
                                logo: 1,
                                images: 1,
                            },
                            destination: {
                                name: 1,
                            },
                            _id: 1,
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
                        name: 1,
                    },
                },
            ]);

            if (orderDetails.length < 1 || orderDetails?.activities?.length < 1) {
                return sendErrorResponse(res, 400, "order not found");
            }

            let tickets = [];
            if (orderDetails[0].activities?.adultTickets)
                tickets = [...tickets, ...orderDetails[0].activities?.adultTickets];
            if (orderDetails[0].activities?.childTickets)
                tickets = [...tickets, ...orderDetails[0].activities?.childTickets];
            if (orderDetails[0].activities?.infantTickets)
                tickets = [...tickets, ...orderDetails[0].activities?.infantTickets];

            const filteredTickets = tickets.filter((ticket) => ticket.ticketNo.includes(ticketNo));
            const theme = await AttractionTicketSetting.findOne({});
            if (theme.selected.toString() === "theme2") {
                const pdfBuffer = await createSingleTicketTheme2Pdf(
                    orderDetails[0].activities,
                    filteredTickets[0]
                );

                res.set({
                    "Content-Type": "application/pdf",
                    "Content-Length": pdfBuffer.length,
                    "Content-Disposition": "attachment; filename=tickets.pdf",
                });
                res.send(pdfBuffer);
            } else if (theme.selected.toString() === "theme3") {
                const pdfBuffer = await createSingleTicketTheme3Pdf(
                    orderDetails[0].activities,
                    filteredTickets[0],
                    orderDetails[0].name
                );

                res.set({
                    "Content-Type": "application/pdf",
                    "Content-Length": pdfBuffer.length,
                    "Content-Disposition": "attachment; filename=tickets.pdf",
                });
                res.send(pdfBuffer);
            } else {
                const pdfBuffer = await createSingleTicketPdf(
                    orderDetails[0].activities,
                    filteredTickets[0]
                );

                res.set({
                    "Content-Type": "application/pdf",
                    "Content-Length": pdfBuffer.length,
                    "Content-Disposition": "attachment; filename=tickets.pdf",
                });
                res.send(pdfBuffer);
            }

            // res.status(200).json(orderDetails[0]);
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    getTimeSlot: async (req, res) => {
        try {
            let response = await getTimeSlots(req.body);

            res.status(200).json(response);
        } catch (err) {}
    },

    getTicketTypes: async (req, res) => {
        try {
            console.log(req.body);

            let ticketData = await getTicketType(req.body);

            let response = await saveTicket(ticketData, req.body);

            res.status(200).json(response);
        } catch (err) {
            console.log(err, "error");
        }
    },

    confirmTickets: async (req, res) => {
        try {
            console.log(req.body);
            const { guestName, BookingId, VoucherNum } = req.body;

            let confirmResponse = await confirmTicket(guestName, BookingId, VoucherNum);

            res.status(200).json(confirmResponse);
        } catch (err) {
            console.log(err.message, "err");
        }
    },

    getOrderDetailsBooking: async (req, res) => {
        try {
            const { orderId } = req.body;

            const response = await orderDetailsBooking(orderId);

            res.status(200).json(response);
        } catch (err) {
            console.log(err);
        }
    },

    getOrderDetails: async (req, res) => {
        try {
            const { orderId } = req.body;

            const response = await orderDetails(orderId);

            res.status(200).json(response);
        } catch (err) {
            console.log(err);
        }
    },

    generatePdf: async (req, res) => {
        try {
            const { bookingId } = req.body;

            const response = await generateBookingPdf(bookingId);

            res.status(200).json(response);
        } catch (err) {
            console.log(err, "err");
        }
    },

    cancelOrderRequest: async (req, res) => {
        try {
            const { orderId } = req.body;

            const response = await cancelBooking(orderId);

            res.status(200).json(response);
        } catch (err) {
            console.log(err);
        }
    },

    testCreditRequest: async (req, res) => {
        try {
            const response = await testCredit();
            res.status(200).json(response);
        } catch (err) {
            console.log(err);
        }
    },

    cancelB2bAttractionActivityOrder: async (req, res) => {
        try {
            const { orderId, activityId } = req.params;
            const { cancellationRemark } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }
            const attractionOrder = await B2BAttractionOrder.findOne({
                _id: orderId,
                // reseller: req.reseller?._id,
            })
                .populate("reseller", "_id role name email referredBy")
                .populate({
                    path: "activities.attraction",
                    select: "id title isApiConnected",
                })
                .populate({
                    path: "activities.activity",
                    select: "id name ",
                });

            if (!attractionOrder) {
                return sendErrorResponse(res, 404, "order details not found");
            }

            const orderDetail = attractionOrder.activities.find((activity) => {
                return activity._id.toString() === activityId.toString() && activity;
            });

            if (!orderDetail) {
                return sendErrorResponse(res, 404, "activity  not found");
            }

            if (orderDetail.status === "cancelled") {
                return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
            }

            if (orderDetail.status !== "booked" && orderDetail.status !== "confirmed") {
                return sendErrorResponse(res, 400, "sorry, this order can't cancel right now.");
            }

            let orderCancellation = await B2BAttractionOrderCancellation.findOne({
                orderId,
                activityId,
                resellerId: attractionOrder.reseller?._id,
                $or: [{ cancellationStatus: "pending" }, { cancellationStatus: "success" }],
            });
            if (orderCancellation) {
                if (orderCancellation.cancellationStatus === "pending") {
                    return sendErrorResponse(
                        res,
                        400,
                        "sorry, this order already submitted cancellation request."
                    );
                } else if (orderCancellation.cancellationStatus === "success") {
                    return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
                }
            } else {
                orderCancellation = await B2BAttractionOrderCancellation.create({
                    cancellationRemark,
                    cancellationStatus: "pending",
                    orderId,
                    resellerId: attractionOrder.reseller?._id,
                    cancelledBy: "b2b",
                    activityId,
                    activity: orderDetail?.activity?._id,
                    activityName: orderDetail?.activity?.name,
                });
            }

            if (orderDetail.isApiConnected === true) {
                return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            }

            await orderCancellation.save();

            res.status(200).json({
                message: "order cancellation request successfully submitted.",
                status: orderDetail.status,
                cancelledBy: orderCancellation.cancelledBy,
                cancellationRemark: orderCancellation.cancellationRemark,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
