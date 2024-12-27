const { sendErrorResponse, sendMobileOtp } = require("../../../helpers");
const { Transfer } = require("../../../models/transfer");
const { b2bTransferOrderSchema } = require("../../validations/transfer/b2bTransfer.schema");
const { State, City, Area, AdminB2bAccess } = require("../../../models/global");
const {
    Attraction,
    Airport,
    GroupArea,
    HomeSettings,
    Country,
    B2bHomeSettings,
    CcavenueLog,
} = require("../../../models");
const { saveCustomCache, getSavedCache } = require("../../../config/cache");
const {
    B2BTransferOrder,
    B2BWallet,
    B2BTransaction,
    B2BTransferOrderPayment,
    B2BOrder,
    B2BOrderPayment,
    B2BAttractionOrder,
    B2BOrderCancellation,
    B2BAttractionOrderCancellation,
    B2BTransferOrderCancellation,
} = require("../../models");
const { generateUniqueString, ccavenueFormHandler } = require("../../../utils");
const { checkWalletBalance, deductAmountFromWallet } = require("../../utils/wallet");
const sendInsufficentBalanceMail = require("../../helpers/sendInsufficentBalanceEmail");
const sendWalletDeductMail = require("../../helpers/sendWalletDeductMail");
const { Hotel } = require("../../../models/hotel");
const { isValidObjectId, Types } = require("mongoose");
const nodeCCAvenue = require("node-ccavenue");
const createB2bTransferOrderInvoice = require("../../helpers/transfer/createTransferOrderInvoice");
const { b2bOrderSchema } = require("../../validations/order/b2bOrder.schema");
const {
    createB2bAttractionOrder,
    createB2bTransferOrder,
    geneB2bOrdersSheet,
} = require("../../helpers/order/b2bCreateOrderHelper");
const {
    attractionOrderCompleteHelper,
} = require("../../helpers/attraction/b2bAttractionOrderHelper");
const b2bOrderInvoice = require("../../helpers/order/b2bOrderInvoice");
const { B2BAttractionOrderPayment } = require("../../models/attraction");
const { transferOrderCompleteHelper } = require("../../helpers/transfer/b2bTransferOrderHelper");
const sendOrderEmail = require("../../helpers/order/b2bOrderEmail");
const {
    promoCodeEligibiltyCheckHelper,
    promoCodeCompeleteHelper,
} = require("../../helpers/promoCode/promoCodeHelper");

const ccav = new nodeCCAvenue.Configure({
    merchant_id: process.env.CCAVENUE_MERCHANT_ID,
    working_key: process.env.CCAVENUE_WORKING_KEY,
});

module.exports = {
    createB2bOrder: async (req, res) => {
        try {
            const {
                countryCode,
                country,
                name,
                email,
                phoneNumber,
                selectedJourneys,
                selectedActivities,
                paymentMethod,
                agentReferenceNumber,
                isPromoCodeApplied = false,
                promoCode,
            } = req.body;

            const { error } = b2bOrderSchema.validate({ ...req.body, isPromoCodeApplied });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({
                isocode: countryCode?.toUpperCase(),
                isDeleted: false,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 400, "country not found");
            }

            const exOrder = await B2BOrder.findOne({
                agentReferenceNumber: agentReferenceNumber?.toLowerCase(),
                reseller: req.reseller?._id,
            });

            if (exOrder) {
                return sendErrorResponse(
                    res,
                    400,
                    "already an order exists with this reference number"
                );
            }
            let netPrice = 0;
            let netProfit = 0;
            let netCost = 0;
            let transferOrderId;
            let attractionOrderId;
            let refNumber = generateUniqueString("B2B");

            if (selectedJourneys?.length > 0) {
                try {
                    const { orderId, profit, price, cost } = await createB2bTransferOrder({
                        country,
                        name,
                        email,
                        phoneNumber,
                        journeys: selectedJourneys,
                        paymentMethod,
                        req,
                        res,
                        referenceNumber: refNumber,
                    });
                    netPrice += price;
                    netProfit += profit;
                    netCost += cost;
                    transferOrderId = orderId;
                } catch (err) {
                    return sendErrorResponse(res, 500, err);
                }
            }

            if (selectedActivities?.length > 0) {
                try {
                    const { orderId, profit, price, cost } = await createB2bAttractionOrder({
                        countryCode,
                        name,
                        email,
                        country,
                        phoneNumber,
                        agentReferenceNumber,
                        selectedActivities,
                        paymentMethod,
                        req,
                        res,
                        referenceNumber: refNumber,
                    });
                    netPrice += price;
                    netProfit += profit;
                    netCost += cost;
                    attractionOrderId = orderId;
                } catch (err) {
                    return sendErrorResponse(res, 500, err);
                }
            }

            let promoDiscount = 0;

            if (isPromoCodeApplied) {
                const { discountAmount } = await promoCodeEligibiltyCheckHelper({
                    selectedJourneys,
                    selectedActivities,
                    code: promoCode,
                    resellerId: req.reseller._id,
                    req,
                });

                promoDiscount = discountAmount;
            }

            const otp = await sendMobileOtp(countryDetail.phonecode, phoneNumber);

            let cardCharge =
                paymentMethod === "ccavenue"
                    ? Number(netPrice - promoDiscount) * process.env.CARD_CHARGE
                    : 0;

            let totalPrice = Number(netPrice - promoDiscount) + cardCharge;

            const b2bOrder = await B2BOrder.create({
                reseller: req?.reseller?._id,
                orderedBy: req?.reseller?.role,
                name: name,
                email: email,
                phoneNumber: phoneNumber,
                country: country,
                otp: otp,
                netPrice: totalPrice,
                netProfit: Number(netProfit - promoDiscount),
                netCost: Number(netCost),
                isAttraction: attractionOrderId ? true : false,
                isTransfer: transferOrderId ? true : false,
                attractionId: attractionOrderId,
                transferId: transferOrderId,
                orderStatus: "pending",
                paymentState: "non-paid",
                agentReferenceNumber,
                referenceNumber: refNumber,
                promoDiscount,
                isPromoCodeApplied,
                promoCode,
                isCardPayment: paymentMethod === "ccavenue" ? true : false,
                cardCharge,
            });

            if (paymentMethod === "ccavenue") {
                // TODO:
                // create a better solution to handle allocations
                // in this approch there is a chance to book single allocation twice or more.

                const transferOrderPayment = await B2BOrderPayment.create({
                    amount: totalPrice,
                    orderId: b2bOrder?._id,
                    paymentState: "pending",
                    resellerId: req.reseller?._id,
                    paymentMethod: "ccavenue",
                    paymentStateMessage: "",
                });

                await CcavenueLog.create({
                    paymentId: transferOrderPayment?._id,
                    orderId: b2bOrder?._id,
                });
                return ccavenueFormHandler({
                    res,
                    totalAmount: totalPrice,
                    redirectUrl: `${process.env.SERVER_URL}/api/v1/b2b/orders/ccavenue/capture`,
                    cancelUrl: `${process.env.SERVER_URL}/api/v1/b2b/orders/ccavenue/capture`,
                    orderId: transferOrderPayment?._id,
                });
            }

            res.status(200).json({
                message: "order has been created",
                orderId: b2bOrder?._id,
                payableAmount: b2bOrder?.netPrice,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    completeB2bOrder: async (req, res) => {
        try {
            const { otp, orderId } = req.body;
            let totalProfit = 0;
            let totalCost = 0;
            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "Invalid order id");
            }

            const b2bOrder = await B2BOrder.findOne({
                _id: orderId,
                reseller: req.reseller._id,
            });
            totalProfit += Number(b2bOrder?.netProfit || 0);
            totalCost += Number(b2bOrder?.netCost) || 0;
            console.log(b2bOrder, "b2bOrder");
            if (!b2bOrder) {
                return sendErrorResponse(res, 400, "order not found");
            }

            if (b2bOrder?.orderStatus === "completed") {
                return sendErrorResponse(res, 400, "sorry, you have already completed this order!");
            }
            console.log(b2bOrder, "dasd");
            if (!b2bOrder?.otp || b2bOrder?.otp !== Number(otp)) {
                return sendErrorResponse(res, 400, "incorrect otp!");
            }

            let totalAmount = b2bOrder.netPrice;

            let wallet = await B2BWallet.findOne({
                reseller: req.reseller?._id,
            });

            const balanceAvailable = checkWalletBalance(wallet, totalAmount);
            if (!balanceAvailable) {
                let reseller = req.reseller;
                sendInsufficentBalanceMail(reseller);
                return sendErrorResponse(
                    res,
                    400,
                    "insufficient balance. please reacharge and try again"
                );
            }

            const orderPayment = await B2BOrderPayment.create({
                amount: totalAmount,
                orderId: b2bOrder?._id,
                paymentState: "pending",
                resellerId: req.reseller?._id,
                paymentMethod: "wallet",
                paymentStateMessage: "",
            });

            let transferOrderPayment;
            let attractionPayment;
            let attractionOrder;
            let transferOrder;

            if (b2bOrder.attractionId) {
                attractionOrder = await B2BAttractionOrder.findOne({
                    _id: b2bOrder.attractionId,
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
                    return sendErrorResponse(
                        res,
                        400,
                        "sorry, you have already completed this order!"
                    );
                }

                try {
                    await attractionOrderCompleteHelper({ attractionOrder });
                } catch (err) {
                    return sendErrorResponse(res, 400, err);
                }

                attractionPayment = await B2BAttractionOrderPayment({
                    amount: attractionOrder.totalAmount,
                    orderId: attractionOrder?._id,
                    paymentState: "pending",
                    paymentStateMessage: "",
                    paymentMethod: "wallet",
                    resellerId: req.reseller?._id,
                });
                await attractionPayment.save();

                attractionOrder.otp = "";
                attractionOrder.orderStatus = "completed";
                attractionOrder.paymentState = "fully-paid";
            }

            if (b2bOrder?.transferId) {
                transferOrder = await B2BTransferOrder.findOne({
                    _id: b2bOrder.transferId,
                    reseller: req.reseller._id,
                });

                if (!transferOrder) {
                    return sendErrorResponse(res, 400, "transfer order not found");
                }

                try {
                    await transferOrderCompleteHelper({ transferOrder });
                } catch (err) {
                    return sendErrorResponse(res, 400, err);
                }

                transferOrderPayment = await B2BTransferOrderPayment.create({
                    amount: transferOrder?.totalNetFare,
                    orderId: transferOrder?._id,
                    paymentState: "pending",
                    resellerId: req.reseller?._id,
                    paymentMethod: "wallet",
                    paymentStateMessage: "",
                });
                transferOrder.paymentState = "fully-paid";
                transferOrder.status = "completed";
            }

            try {
                await deductAmountFromWallet(wallet, totalAmount);
            } catch (err) {
                orderPayment.paymentState = "failed";
                await orderPayment.save();

                return sendErrorResponse(res, 400, "wallet deduction failed, please try again");
            }

            if (b2bOrder.attractionId) {
                await attractionOrder.save();

                for (let i = 0; i < attractionOrder?.activities.length; i++) {
                    let activity = attractionOrder?.activities[i];
                    console.log(activity, "activity");
                    totalCost += Number(activity.totalCost);
                    totalProfit += Number(activity.profit);
                }

                console.log(totalCost, totalProfit);

                attractionPayment.paymentState = "success";
                await attractionPayment.save();
            }

            if (b2bOrder.transferId) {
                await transferOrder.save();
                transferOrderPayment.paymentState = "success";
                await transferOrderPayment.save();
            }

            orderPayment.paymentState = "success";
            await orderPayment.save();

            await B2BTransaction.create({
                reseller: req.reseller?._id,
                paymentProcessor: "wallet",
                product: "all",
                processId: orderId,
                description: `Multiple booking payment`,
                debitAmount: totalAmount,
                creditAmount: 0,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "Multiple booking payment",
                dateTime: new Date(),
            });

            let reseller = req.reseller;
            sendWalletDeductMail(reseller, b2bOrder, totalAmount);

            if (b2bOrder.isPromoCodeApplied) {
                await promoCodeCompeleteHelper({
                    code: b2bOrder?.promoCode,
                    orderId: b2bOrder._id,
                    resellerId: req.reseller._id,
                    discountAmount: b2bOrder?.promoDiscount,
                });
            }
            b2bOrder.paymentState = "fully-paid";
            b2bOrder.orderStatus = "completed";
            b2bOrder.netProfit = Number(totalProfit);
            b2bOrder.netCost = Number(totalCost);

            await b2bOrder.save();

            const adminAccess = await AdminB2bAccess.findOne({
                reseller: req.reseller._id,
            }).populate("attractions");

            if (adminAccess && adminAccess?.attractions?.length > 0) {
                for (let i = 0; i < adminAccess?.attractions?.length; i++) {
                    sendOrderEmail({
                        product: "attraction",
                        action: "order",
                        subject: "New Order From B2B",
                        name: req.reseller.name,
                        email: adminAccess.attractions[i]?.email,
                        order: b2bOrder,
                        attractionOrder: attractionOrder,
                        transferOrder: transferOrder,
                        orderedBy: "b2b",
                    });
                }
            } else {
                sendOrderEmail({
                    product: "attraction",
                    action: "order",
                    subject: "New Order From B2B",
                    name: req.reseller.name,
                    email: "confirmations@behappytourism.com",
                    order: b2bOrder,
                    attractionOrder: attractionOrder,
                    transferOrder: transferOrder,
                    orderedBy: "b2b",
                });
            }

            sendOrderEmail({
                product: "attraction",
                action: "order",
                subject: "Order Placed Successfully",
                name: req.reseller.name,
                email: req.reseller.email,
                order: b2bOrder,
                attractionOrder: attractionOrder,
                transferOrder: transferOrder,
                orderedBy: "b2b",
            });
            res.status(200).json({
                message: "order successfully placed",
                referenceNumber: b2bOrder.referenceNumber,
                _id: b2bOrder?._id,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    completeOrderWithCcAvenue: async (req, res) => {
        try {
            const { encResp } = req.body;

            const decryptedJsonResponse = ccav.redirectResponseToJson(encResp);
            const { order_id, order_status } = decryptedJsonResponse;
            const ccavenueLog = await CcavenueLog.findOne({ paymentId: order_id });
            ccavenueLog.data = decryptedJsonResponse;
            await ccavenueLog.save();

            let totalProfit = 0;
            let totalCost = 0;

            const orderPayment = await B2BOrderPayment.findById(order_id);
            if (!orderPayment) {
                return sendErrorResponse(
                    res,
                    400,
                    "order payment not found!. Please check with our team if amount is debited from your bank!"
                );
            }

            const b2bOrder = await B2BOrder.findOne({
                _id: orderPayment?.orderId,
            });

            totalProfit += Number(b2bOrder?.netProfit || 0);
            totalCost += Number(b2bOrder?.netCost) || 0;

            if (!b2bOrder) {
                return sendErrorResponse(res, 400, "order  not found!");
            }

            if (b2bOrder?.orderStatus === "completed") {
                return sendErrorResponse(res, 400, "sorry, you have already completed this order!");
            }

            // if (new Date(b2bHotelOrder.expiresIn).getTime() < new Date().getTime()) {
            //     return sendErrorResponse(
            //         res,
            //         400,
            //         "your order is expired, please create a new order. Please check with our team if amount is debited from your bank!"
            //     );
            // }

            let wallet = await B2BWallet.findOne({ reseller: b2bOrder?.reseller });
            if (!wallet) {
                wallet = await B2BWallet.create({
                    balance: 0,
                    creditAmount: 0,
                    creditUsed: 0,
                    reseller: b2bOrder?.reseller,
                });
            }

            let transferOrderPayment;
            let attractionPayment;
            let attractionOrder;
            let transferOrder;

            if (order_status !== "Success") {
                orderPayment.status = "failed";
                await orderPayment.save();

                res.writeHead(301, {
                    Location: `${process.env.B2B_WEB_URL}/payment-decline`,
                });
                res.end();
            } else {
                if (b2bOrder.attractionId) {
                    attractionOrder = await B2BAttractionOrder.findOne({
                        _id: b2bOrder.attractionId,
                        reseller: b2bOrder.reseller,
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
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, you have already completed this order!"
                        );
                    }

                    try {
                        await attractionOrderCompleteHelper({ attractionOrder });
                    } catch (err) {
                        return sendErrorResponse(res, 400, err);
                    }

                    attractionOrder.otp = "";
                    attractionOrder.orderStatus = "completed";
                    attractionOrder.paymentState = "fully-paid";
                    await attractionOrder.save();
                }

                if (b2bOrder?.transferId) {
                    transferOrder = await B2BTransferOrder.findOne({
                        _id: b2bOrder.transferId,
                        reseller: b2bOrder?.reseller,
                    });

                    if (!transferOrder) {
                        return sendErrorResponse(res, 400, "transfer order not found");
                    }

                    try {
                        transferOrder = await transferOrderCompleteHelper({ transferOrder });
                    } catch (err) {
                        return sendErrorResponse(res, 400, err);
                    }

                    transferOrder.paymentState = "fully-paid";
                    transferOrder.status = "completed";
                    await transferOrder.save();
                }

                if (b2bOrder?.attractionId) {
                    await attractionOrder.save();
                    for (let i = 0; i < attractionOrder?.activities.length; i++) {
                        let activity = attractionOrder?.activities[i];
                        console.log(activity, "activity");
                        totalCost += Number(activity.totalCost);
                        totalProfit += Number(activity.profit);
                    }

                    attractionPayment = await B2BAttractionOrderPayment.findOne({
                        orderId: b2bOrder.attractionId,
                    });

                    attractionPayment.paymentState = "success";
                    await attractionPayment.save();
                }

                if (b2bOrder?.transferId) {
                    transferOrderPayment = await B2BTransferOrderPayment.findOne({
                        orderId: b2bOrder.transferId,
                    });
                    await transferOrder.save();
                    transferOrderPayment.paymentState = "success";
                    await transferOrderPayment.save();
                }
                orderPayment.paymentState = "success";
                await orderPayment.save();

                await B2BTransaction.create({
                    reseller: b2bOrder?.reseller,
                    paymentProcessor: "ccavenue",
                    product: "all",
                    processId: b2bOrder?._id,
                    description: `All order payment`,
                    debitAmount: 0,
                    creditAmount: 0,
                    directAmount: b2bOrder?.netPrice,
                    closingBalance: wallet.balance,
                    dueAmount: wallet.creditUsed,
                    remark: "All order payment",
                    dateTime: new Date(),
                });

                if (b2bOrder.isPromoCodeApplied) {
                    await promoCodeCompeleteHelper({
                        code: b2bOrder?.promoCode,
                        orderId: b2bOrder._id,
                        resellerId: b2bOrder?.reseller,
                        discountAmount: b2bOrder?.promoDiscount,
                    });
                }

                b2bOrder.paymentState = "fully-paid";
                b2bOrder.orderStatus = "completed";
                b2bOrder.netProfit = Number(totalProfit);
                b2bOrder.netCost = Number(totalCost);
                await b2bOrder.save();

                const adminAccess = await AdminB2bAccess.findOne({
                    reseller: req.reseller._id,
                }).populate("attractions");

                if (adminAccess && adminAccess?.attractions?.length > 0) {
                    for (let i = 0; i < adminAccess?.attractions?.length; i++) {
                        sendOrderEmail({
                            type: "products",
                            subject: "New Order From B2B",
                            name: req.reseller.name,
                            email: adminAccess.attractions[i]?.email,
                            order: b2bOrder,
                            attractionOrder: attractionOrder,
                            transferOrder: transferOrder,
                        });
                    }
                } else {
                    sendOrderEmail({
                        subject: "New Order From B2B",
                        name: req.reseller.name,
                        email: process.env.EMAIL,
                        order: b2bOrder,
                        attractionOrder: attractionOrder,
                        transferOrder: transferOrder,
                    });
                }

                sendOrderEmail({
                    subject: "Order Placed Successfully",
                    name: req.reseller.name,
                    email: req.reseller.email,
                    order: b2bOrder,
                    attractionOrder: attractionOrder,
                    transferOrder: transferOrder,
                });
                res.writeHead(301, {
                    Location: `${process.env.B2B_WEB_URL}/order/invoice/${b2bOrder?._id}`,
                });
                res.end();
            }
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getAllOrders: async (req, res) => {
        try {
            const { skip = 0, limit = 10, search, dateFrom, dateTo } = req.query;

            const filter = { reseller: req.reseller._id, orderStatus: "completed" };

            if (search && search !== "") {
                filter.$or = [{ referenceNumber: { $regex: search, $options: "i" } }];
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filter.$and = [
                    { createdAt: { $gte: new Date(dateFrom) } },
                    { createdAt: { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filter["createdAt"] = {
                    $gte: new Date(dateFrom),
                };
            } else if (dateTo && dateTo !== "") {
                filter["createdAt"] = { $lte: new Date(dateTo) };
            }

            const transferOrders = await B2BOrder.find(filter)
                .populate("transferId attractionId")
                .populate("transferId.trips.vehicleType")
                .select({
                    baseFare: 0,
                    profit: 0,
                })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalTransfers = await B2BOrder.find(filter).count();

            res.status(200).json({
                transferOrders,
                totalTransfers,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleOrder: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid transfer id");
            }
            const b2bOrder = await B2BOrder.findById(id)
                .populate("reseller", "name email agentCode")
                .select({
                    baseFare: 0,
                    profit: 0,
                })
                .lean();

            console.log(b2bOrder, "b2border");
            if (!b2bOrder) {
                return sendErrorResponse(res, 400, "No  order found ");
            }

            if (b2bOrder?.isAttraction) {
                const attOrder = await B2BAttractionOrder.findById(b2bOrder.attractionId)
                    .populate({
                        path: "activities.activity",
                        select: "name attraction",
                        populate: {
                            path: "attraction",
                            select: "title images destination",
                            populate: {
                                path: "destination",
                                select: "name",
                            },
                        },
                    })
                    .select(
                        "activities._id activities.grandTotal activities.hoursCount activities.privateTransfers activities.activity activities.date activities.adultsCount activities.childrenCount activities.infantCount activities.childTickets activities.adultTickets activities.infantTickets activities.transferType  activities.status  totalAmount orderStatus paymentState"
                    )
                    .exec();

                b2bOrder.attractionOrder = attOrder;
            }

            if (b2bOrder?.isTransfer) {
                const transferOrder = await B2BTransferOrder.findById(b2bOrder.transferId)
                    .populate("journey.trips.vehicleTypes.vehicleId")
                    .select(
                        "journey.transferType journey.noOfAdults journey.noOfChildrens journey.trips journey.netPrice netFare paymentState journey._id"
                    )

                    .exec();
                // .lean();

                b2bOrder.transferOrder = transferOrder;
            }

            res.status(200).json(b2bOrder);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadOrderInvoice: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid hotel order id");
            }

            const b2bOrder = await B2BOrder.findOne({
                _id: orderId,
                // reseller: req.reseller?._id,
            })
                .select("_id status")
                .lean();
            if (!b2bOrder) {
                return sendErrorResponse(res, 404, "transfer order not found");
            }
            const b2bOrderPayment = await B2BOrderPayment.findOne({ orderId: orderId });

            if (b2bOrder.status === "pending") {
                return sendErrorResponse(res, 400, "sorry, transfer order not completed");
            }

            const pdfBuffer = await b2bOrderInvoice({
                orderId,
                resellerId: req.reseller?._id,
                paymentMethod: b2bOrderPayment.paymentMethod,
            });

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=invoice.pdf",
            });
            res.send(pdfBuffer);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleB2bAllOrdersSheet: async (req, res) => {
        try {
            await geneB2bOrdersSheet({
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

    cancelB2bOrder: async (req, res) => {
        try {
            const { orderId, attractionCancellations, transferCancellations, cancellationRemark } =
                req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const b2bOrder = await B2BOrder.findOne({ _id: orderId });

            if (!b2bOrder) {
                return sendErrorResponse(res, 404, "order  not found");
            }

            let prevOrderCancellation = await B2BOrderCancellation.findOne({
                orderId,
                $or: [
                    { cancellationStatus: "pending", cancelledBy: "b2b" },
                    { cancellationStatus: "success" },
                ],
            });

            if (prevOrderCancellation) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry, there is already a pending request or approved cancellation request."
                );
            }

            if (b2bOrder.attractionId && attractionCancellations.length > 0) {
                const attractionOrder = await B2BAttractionOrder.findOne({
                    _id: b2bOrder.attractionId,
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
                for (let i = 0; i < attractionCancellations.length; i++) {
                    let activityId = attractionCancellations[i];
                    const orderDetail = attractionOrder?.activities?.find((activity) => {
                        return activity?._id?.toString() === activityId?.toString() && activity;
                    });

                    if (!orderDetail) {
                        return sendErrorResponse(res, 404, "activity  not found");
                    }

                    if (orderDetail?.status === "cancelled") {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, this order is already cancelled."
                        );
                    }

                    if (orderDetail.status !== "booked" && orderDetail.status !== "confirmed") {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, this order can't cancel right now."
                        );
                    }

                    let orderCancellation = await B2BAttractionOrderCancellation.findOne({
                        orderId: b2bOrder.attractionId,
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
                            return sendErrorResponse(
                                res,
                                400,
                                "sorry, this order is already cancelled."
                            );
                        }
                    } else {
                        orderCancellation = await B2BAttractionOrderCancellation.create({
                            cancellationRemark,
                            cancellationStatus: "pending",
                            orderId: b2bOrder.attractionId,
                            resellerId: attractionOrder.reseller?._id,
                            cancelledBy: "b2b",
                            activityId,
                            activity: orderDetail?.activity?._id,
                            activityName: orderDetail?.activity?.name,
                        });
                    }

                    await orderCancellation.save();
                }
            }

            if (b2bOrder.transferId && transferCancellations.length > 0) {
                const transferOrder = await B2BTransferOrder.findOne({
                    _id: b2bOrder?.transferId,
                    // reseller: req.reseller?._id,
                }).populate("reseller", "_id role name email referredBy");

                if (!transferOrder) {
                    return sendErrorResponse(res, 404, "order details not found");
                }
                for (let i = 0; i < transferCancellations.length; i++) {
                    let transferId = transferCancellations[i];
                    const orderDetail = transferOrder.journey.find((joun) => {
                        return joun._id.toString() === transferId.toString();
                    });

                    if (!orderDetail) {
                        return sendErrorResponse(res, 404, "activity  not found");
                    }

                    if (orderDetail.status === "cancelled") {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, this order is already cancelled."
                        );
                    }

                    if (orderDetail.status !== "booked" && orderDetail.status !== "confirmed") {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, this order can't cancel right now."
                        );
                    }

                    let orderCancellation = await B2BTransferOrderCancellation.findOne({
                        orderId: b2bOrder.transferId,
                        transferId,
                        resellerId: transferOrder.reseller?._id,
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
                            return sendErrorResponse(
                                res,
                                400,
                                "sorry, this order is already cancelled."
                            );
                        }
                    } else {
                        orderCancellation = await B2BTransferOrderCancellation.create({
                            cancellationRemark,
                            cancellationStatus: "pending",
                            orderId: b2bOrder.transferId,
                            resellerId: transferOrder.reseller?._id,
                            cancelledBy: "b2b",
                            transferId,
                        });
                    }

                    await orderCancellation.save();
                }
            }

            let orderCancellation = await B2BOrderCancellation.create({
                cancellationRemark,
                cancellationStatus: "pending",
                orderId,
                resellerId: b2bOrder?.reseller,
                cancelledBy: "b2b",
            });

            await orderCancellation.save();

            res.status(200).json({
                message: "order cancellation request successfully submitted.",
                orderId: orderId,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },
};
