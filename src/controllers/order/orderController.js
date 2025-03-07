const { sendErrorResponse, userOrderSignUpEmail } = require("../../helpers");
const { b2cOrderSchema } = require("../../validations/orders/b2cOrder.Schema");
const { isValidObjectId } = require("mongoose");
const {
    Country,
    B2CTransferOrderPayment,
    B2CAttractionOrderPayment,
    B2COrderCancellation,
    B2CAttractionOrderCancellation,
    B2CTransferOrderCancellation,
    B2CWallet,
} = require("../../models");
const {
    B2COrder,
    B2COrderPayment,
    AttractionOrder,
    B2CTransferOrder,
    B2CTransaction,
    CcavenueLog,
} = require("../../models");
const { User } = require("../../models");
const { hash } = require("bcryptjs");
const {
    createB2cTransferOrder,
    createB2cAttractionOrder,
    generateB2cOrderSheet,
} = require("../../helpers/orders/b2cCreateOrderHelper");
const { ccavenueFormHandler, generateUniqueString } = require("../../utils");
const nodeCCAvenue = require("node-ccavenue");
const { completeOrderAfterPayment } = require("../../helpers/attractionOrderHelpers");
const { transferOrderCompletHelpers } = require("../../helpers/orders/transferOrderHelper");
const b2cOrderInvoice = require("../../helpers/orders/b2cOrderInvoiceHelper");
const { B2BAttractionOrderPayment } = require("../../b2b/models/attraction");
const checkWalletB2cBalance = require("../../utils/wallet/checkWalletB2cBalance");
const deductMoneyFromB2cWallet = require("../../utils/wallet/deductMoneyB2cWallet");
const sendOrderEmail = require("../../b2b/helpers/order/b2bOrderEmail");

const ccav = new nodeCCAvenue.Configure({
    merchant_id: process.env.CCAVENUE_MERCHANT_ID,
    working_key: process.env.CCAVENUE_WORKING_KEY,
});

module.exports = {
    createB2cOrder: async (req, res) => {
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
                // referenceNumber,
            } = req.body;

            const { error } = b2cOrderSchema.validate(req.body);

            if (error) return sendErrorResponse(res, 400, error.details[0].message);
            if (!isValidObjectId(country)) return sendErrorResponse(res, 400, "invalid country id");

            console.log(req?.user, "req?.user");
            let wallet = await B2CWallet.findOne({
                user: req?.user,
            });

            if (!wallet && (paymentMethod === "wallet" || paymentMethod === "wallet-ccavenue")) {
                return sendErrorResponse(res, 400, "wallet amount not found for this user ");
            }

            const countryDetails = await Country.findOne({
                isocode: countryCode?.toUpperCase(),
                isDeleted: false,
            });

            if (!countryDetails) return sendErrorResponse(res, 400, "country not found");

            let user;

            if (!req.user) {
                user = await User.findOne({ email });
                if (!user) {
                    async function generateRandomPassword() {
                        const capitalLetters = "EFGHABCDPQRSTUVIJKLMNOWXYZ";
                        const smallLetters = "abcderstuvwxyzfghijklmnopq";
                        const numbers = "0123456789";
                        const specialChars = "@";
                        const allChars = capitalLetters + smallLetters + numbers + specialChars;

                        let password = "";

                        // Add one capital letter
                        password += capitalLetters.charAt(
                            Math.floor(Math.random() * capitalLetters.length)
                        );

                        // Add one small letter
                        password += smallLetters.charAt(
                            Math.floor(Math.random() * smallLetters.length)
                        );

                        // Add one number
                        password += numbers.charAt(Math.floor(Math.random() * numbers.length));

                        // Add one "@" symbol
                        password += "@";

                        // Add two random characters from the combined set (to total 5 characters)
                        for (let i = 0; i < 2; i++) {
                            password += allChars.charAt(
                                Math.floor(Math.random() * allChars.length)
                            );
                        }

                        // Shuffle the characters of the password to randomize their positions
                        password = password
                            .split("")
                            .sort(() => Math.random() - 0.5)
                            .join("");

                        return password;
                    }

                    const password = await generateRandomPassword();
                    const hashedPassword = await hash(password, 8);

                    user = new User({
                        name,
                        email,
                        phoneNumber,
                        country,
                        password: hashedPassword,
                    });

                    await user.save();

                    userOrderSignUpEmail(
                        email,
                        "New Account",
                        `username : ${email} password: ${password}`
                    );
                }
            }

            let buyer = req.user || user;

            // const existOrder = await B2COrder.findOne({
            //     referenceNumber: referenceNumber,
            //     user: buyer?._id,
            // });

            // if (existOrder)
            //     return sendErrorResponse(
            //         res,
            //         400,
            //         "already an order exist with this reference number"
            //     );

            let netPrice = 0;
            let netProfit = 0;
            let netCost = 0;
            let transferOrderId;
            let attractionOrderId;

            let refNumber = generateUniqueString("B2C");

            if (selectedJourneys?.length > 0) {
                try {
                    const { orderId, profit, price, cost } = await createB2cTransferOrder({
                        country,
                        name,
                        email,
                        phoneNumber,
                        journeys: selectedJourneys,
                        paymentMethod,
                        req,
                        res,
                        buyer,
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
                    const { orderId, profit, price, cost } = await createB2cAttractionOrder({
                        countryCode,
                        name,
                        email,
                        country,
                        phoneNumber,
                        referenceNumber: refNumber,
                        selectedActivities,
                        paymentMethod,
                        req,
                        res,
                        buyer,
                    });

                    netPrice += price;
                    netProfit += profit;
                    netCost += cost;
                    attractionOrderId = orderId;
                } catch (err) {
                    console.log(err);
                    return sendErrorResponse(res, 500, err);
                }
            }

            const b2cOrder = await B2COrder.create({
                user: buyer?._id,
                name: name,
                email: email,
                phoneNumber: phoneNumber,
                country: country,
                otp: "",
                netPrice: Number(netPrice),
                netProfit: Number(netProfit),
                netCost: Number(netCost),
                isAttraction: attractionOrderId ? true : false,
                isTransfer: transferOrderId ? true : false,
                attractionId: attractionOrderId,
                transferId: transferOrderId,
                orderStatus: "pending",
                paymentState: "non-paid",
                referenceNumber: refNumber,
            });

            if (paymentMethod === "ccavenue") {
                const b2cOrderPayment = await B2COrderPayment.create({
                    amount: netPrice,
                    orderId: b2cOrder?._id,
                    paymentState: "pending",
                    user: buyer?._id,
                    paymentMethod: "ccavenue",
                    paymentStateMessage: "",
                });

                return ccavenueFormHandler({
                    res,
                    totalAmount: netPrice,
                    redirectUrl: `${process.env.SERVER_URL}/api/v1/orders/ccavenue/capture`,
                    cancelUrl: `${process.env.SERVER_URL}/api/v1/orders/ccavenue/capture`,
                    orderId: b2cOrderPayment?._id,
                });
            } else if (paymentMethod === "wallet") {
                if (Number(wallet.balance) >= Number(netPrice)) {
                    res.status(200).json({
                        message: "order has been created",
                        orderId: b2cOrder?._id,
                        payableAmount: b2cOrder?.netPrice,
                    });
                } else {
                    return sendErrorResponse(res, 400, "wallet balance is less than total price");
                }
            } else if (paymentMethod === "ccavenue-wallet") {
                if (Number(wallet.balance) < Number(netPrice)) {
                    let ccAvenuePayable = Number(netPrice) - Number(wallet.balance);

                    const b2cOrderPayment = await B2COrderPayment.create({
                        amount: netPrice,
                        orderId: b2cOrder?._id,
                        paymentState: "pending",
                        user: buyer?._id,
                        paymentMethod: "ccavenue-wallet",
                        paymentStateMessage: "",
                        walletAmount: wallet.balance,
                    });

                    return ccavenueFormHandler({
                        res,
                        totalAmount: ccAvenuePayable,
                        redirectUrl: `${process.env.SERVER_URL}/api/v1/orders/ccavenue/capture`,
                        cancelUrl: `${process.env.SERVER_URL}/api/v1/orders/ccavenue/capture`,
                        orderId: b2cOrderPayment?._id,
                    });
                } else {
                    return sendErrorResponse(
                        res,
                        400,
                        "wallet balance is greater than total price"
                    );
                }
            } else {
                return sendErrorResponse(res, 400, "choose correct payment method");
            }
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    completeB2cOrder: async (req, res) => {
        try {
            const { otp, orderId } = req.body;
            let totalProfit = 0;
            let totalCost = 0;
            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "Invalid order id");
            }

            const b2cOrder = await B2COrder.findOne({
                _id: orderId,
            });
            totalProfit += Number(b2cOrder?.netProfit || 0);
            totalCost += Number(b2cOrder?.netCost) || 0;

            if (!b2cOrder) {
                return sendErrorResponse(res, 400, "order not found");
            }

            if (b2cOrder?.orderStatus === "completed") {
                return sendErrorResponse(res, 400, "sorry, you have already completed this order!");
            }

            let totalAmount = b2cOrder.netPrice;

            let wallet = await B2CWallet.findOne({
                user: req.user,
            });

            const balanceAvailable = await checkWalletB2cBalance(wallet, totalAmount);
            if (!balanceAvailable) {
                let reseller = req.reseller;
                // sendInsufficentBalanceMail(reseller);
                return sendErrorResponse(
                    res,
                    400,
                    "insufficient balance. please reacharge and try again"
                );
            }

            const orderPayment = await B2COrderPayment.create({
                amount: totalAmount,
                orderId: b2cOrder?._id,
                paymentState: "pending",
                user: req.user?._id,
                paymentMethod: "wallet",
                paymentStateMessage: "",
            });

            let transferOrderPayment;
            let attractionPayment;
            let attractionOrder;
            let transferOrder;

            if (b2cOrder.attractionId) {
                attractionOrder = await AttractionOrder.findOne({
                    _id: b2cOrder.attractionId,
                    user: b2cOrder?.user,
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
                    return sendErrorResponse(res, 400, "attraction order not found!");
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
                    await completeOrderAfterPayment(attractionOrder);
                } catch (err) {
                    return sendErrorResponse(res, 400, err);
                }

                attractionPayment = await B2CAttractionOrderPayment({
                    amount: attractionOrder.totalAmount,
                    orderId: attractionOrder?._id,
                    paymentState: "pending",
                    userId: b2cOrder?.user,
                    paymentMethod: "ccavenue",
                    paymentStateMessage: "",
                });
                await attractionPayment.save();

                attractionOrder.otp = "";
                attractionOrder.orderStatus = "completed";
                attractionOrder.paymentState = "fully-paid";
            }

            if (b2cOrder.transferId) {
                transferOrder = await B2CTransferOrder.findOne({
                    _id: b2cOrder.transferId,
                    user: b2cOrder.user,
                });

                if (!transferOrder) return sendErrorResponse(res, 400, "transfer order not found!");

                try {
                    transferOrder = await transferOrderCompletHelpers({ transferOrder });
                } catch (err) {
                    return sendErrorResponse(res, 400, err);
                }

                transferOrderPayment = await B2CTransferOrderPayment.create({
                    amount: transferOrder?.totalNetFare,
                    orderId: transferOrder?._id,
                    paymentState: "pending",
                    user: b2cOrder?.user,
                    paymentMethod: "ccavenue",
                    paymentStateMessage: "",
                });

                transferOrder.paymentState = "fully-paid";
                transferOrder.status = "completed";
                await transferOrder.save();
            }
            try {
                await deductMoneyFromB2cWallet(wallet, totalAmount);
            } catch (err) {
                orderPayment.paymentState = "failed";
                await orderPayment.save();

                return sendErrorResponse(res, 400, "wallet deduction failed, please try again");
            }

            if (b2cOrder.attractionId) {
                await attractionOrder.save();

                for (let i = 0; i < attractionOrder?.activities.length; i++) {
                    let activity = attractionOrder?.activities[i];
                    console.log(activity, "activity");
                    totalCost += Number(activity.totalCost);
                    totalProfit += Number(activity.profit);
                }

                attractionPayment.paymentState = "success";
                await attractionPayment.save();
            }

            if (b2cOrder.transferId) {
                await transferOrder.save();
                transferOrderPayment.paymentState = "success";
                await transferOrderPayment.save();
            }

            orderPayment.paymentState = "success";
            await orderPayment.save();

            await B2CTransaction.create({
                user: b2cOrder?.user,
                paymentProcessor: "ccavenue",
                product: "all",
                processId: b2cOrder?._id,
                description: `order payment`,
                directAmount: b2cOrder.netPrice,
                remark: "order payment",
                dateTime: new Date(),
            });

            b2cOrder.paymentState = "fully-paid";
            b2cOrder.orderStatus = "completed";
            b2cOrder.netProfit = Number(totalProfit);
            b2cOrder.netCost = Number(totalCost);
            await b2cOrder.save();

            sendOrderEmail({
                product: "attraction",
                action: "order",
                subject: "Order Placed Successfully",
                name: b2cOrder.name,
                email: b2cOrder.email,
                order: b2cOrder,
                attractionOrder: attractionOrder,
                transferOrder: transferOrder,
                orderedBy: "b2c",
            });

            sendOrderEmail({
                product: "attraction",
                action: "order",
                subject: `New Order From B2C - ${b2cOrder.referenceNumber}`,
                name: b2cOrder.name,
                email: "confirmations@behappytourism.com",
                order: b2cOrder,
                attractionOrder: attractionOrder,
                transferOrder: transferOrder,
                orderedBy: "b2c",
            });
            res.status(200).json({
                message: "order successfully placed",
                referenceNumber: b2cOrder.referenceNumber,
                _id: b2cOrder?._id,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    captureCCAvenueOrderPayment: async (req, res) => {
        try {
            const { encResp } = req.body;
            const decryptedJsonResponse = ccav.redirectResponseToJson(encResp);
            const { order_id, order_status } = decryptedJsonResponse;

            // const { order_id, order_status } = req.body;

            let totalProfit = 0;
            let totalCost = 0;
            // const { order_id, order_status = "Success" } = req.query;
            const orderPayment = await B2COrderPayment.findById(order_id);
            if (!orderPayment)
                return sendErrorResponse(
                    res,
                    400,
                    "order payment not found!. Please check with our team if amount is debited from your bank!"
                );

            const b2cOrder = await B2COrder.findOne({
                _id: orderPayment?.orderId,
            });

            if (!b2cOrder) return sendErrorResponse(res, 400, "order not found!");

            let wallet = await B2CWallet.findOne({
                user: b2cOrder?.user,
            });

            console.log(wallet, "wallet");
            if (orderPayment?.paymentMethod === "ccavenue-wallet") {
                const balanceAvailable = checkWalletB2cBalance(
                    wallet,
                    Number(orderPayment?.walletAmount)
                );
                if (!balanceAvailable) {
                    return sendErrorResponse(res, 400, "insufficient wallet balance. ");
                }
            }

            totalProfit += Number(b2cOrder?.netProfit || 0);
            totalCost += Number(b2cOrder?.netCost) || 0;

            if (b2cOrder?.orderStatus === "completed") {
                return sendErrorResponse(res, 400, "sorry, you have already completed this order!");
            }

            let transferOrderPayment;
            let attractionPayment;
            let attractionOrder;
            let transferOrder;

            if (order_status !== "Success") {
                orderPayment.paymentState = "failed";
                await orderPayment.save();
                res.writeHead(301, {
                    Location: `${process.env.REACT_APP_URL}/payment/failure/${orderPayment?.orderId}`,
                });

                res.end();
            } else {
                if (b2cOrder.attractionId) {
                    attractionOrder = await AttractionOrder.findOne({
                        _id: b2cOrder.attractionId,
                        user: b2cOrder?.user,
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
                        return sendErrorResponse(res, 400, "attraction order not found!");
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
                        await completeOrderAfterPayment(attractionOrder);
                    } catch (err) {
                        return sendErrorResponse(res, 400, err);
                    }

                    attractionPayment = await B2CAttractionOrderPayment({
                        amount: attractionOrder.totalAmount,
                        orderId: attractionOrder?._id,
                        paymentState: "pending",
                        userId: b2cOrder?.user,
                        paymentMethod: "ccavenue",
                        paymentStateMessage: "",
                    });
                    await attractionPayment.save();

                    attractionOrder.otp = "";
                    attractionOrder.orderStatus = "completed";
                    attractionOrder.paymentState = "fully-paid";
                }

                if (b2cOrder.transferId) {
                    transferOrder = await B2CTransferOrder.findOne({
                        _id: b2cOrder.transferId,
                        user: b2cOrder.user,
                    });

                    if (!transferOrder)
                        return sendErrorResponse(res, 400, "transfer order not found!");

                    try {
                        transferOrder = await transferOrderCompletHelpers({ transferOrder });
                    } catch (err) {
                        return sendErrorResponse(res, 400, err);
                    }

                    transferOrderPayment = await B2CTransferOrderPayment.create({
                        amount: transferOrder?.totalNetFare,
                        orderId: transferOrder?._id,
                        paymentState: "pending",
                        user: b2cOrder?.user,
                        paymentMethod: "ccavenue",
                        paymentStateMessage: "",
                    });

                    transferOrder.paymentState = "fully-paid";
                    transferOrder.status = "completed";
                    await transferOrder.save();
                }

                if (orderPayment?.paymentMethod === "ccavenue-wallet") {
                    try {
                        await deductMoneyFromB2cWallet(wallet, Number(orderPayment?.walletAmount));
                    } catch (err) {
                        orderPayment.paymentState = "failed";
                        await orderPayment.save();

                        return sendErrorResponse(
                            res,
                            400,
                            "wallet deduction failed, please try again"
                        );
                    }
                }

                if (b2cOrder.attractionId) {
                    await attractionOrder.save();

                    for (let i = 0; i < attractionOrder?.activities.length; i++) {
                        let activity = attractionOrder?.activities[i];
                        console.log(activity, "activity");
                        totalCost += Number(activity.totalCost);
                        totalProfit += Number(activity.profit);
                    }

                    attractionPayment.paymentState = "success";
                    await attractionPayment.save();
                }

                if (b2cOrder.transferId) {
                    await transferOrder.save();
                    transferOrderPayment.paymentState = "success";
                    await transferOrderPayment.save();
                }

                orderPayment.paymentState = "success";
                await orderPayment.save();

                await B2CTransaction.create({
                    user: b2cOrder?.user,
                    paymentProcessor: "ccavenue",
                    product: "all",
                    processId: b2cOrder?._id,
                    description: `order payment`,
                    directAmount: b2cOrder.netPrice,
                    remark: "order payment",
                    dateTime: new Date(),
                });

                // await B2CTransaction.create({
                //     user: b2cOrder?.user,
                //     transactionType: "deduct",
                //     status: "success",
                //     paymentProcessor: "ccavenue",
                //     orderId: b2cOrder?._id,
                //     amount: b2cOrder?.netPrice,
                // });

                b2cOrder.paymentState = "fully-paid";
                b2cOrder.orderStatus = "completed";
                b2cOrder.netProfit = Number(totalProfit);
                b2cOrder.netCost = Number(totalCost);
                await b2cOrder.save();

                sendOrderEmail({
                    product: "attraction",
                    action: "order",
                    subject: "Order Placed Successfully",
                    name: b2cOrder.name,
                    email: b2cOrder.email,
                    order: b2cOrder,
                    attractionOrder: attractionOrder,
                    transferOrder: transferOrder,
                    orderedBy: "b2c",
                });

                sendOrderEmail({
                    product: "attraction",
                    action: "order",
                    subject: `New Order From B2C - ${b2cOrder.referenceNumber}`,
                    name: b2cOrder.name,
                    email: "confirmations@behappytourism.com",
                    order: b2cOrder,
                    attractionOrder: attractionOrder,
                    transferOrder: transferOrder,
                    orderedBy: "b2c",
                });

                res.writeHead(301, {
                    Location: `${process.env.REACT_APP_URL}/payment/success/${b2cOrder?._id}`,
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

            const filter = { user: req.user?._id };

            if (search && search != "") {
                filter.$or = [{ referenceNumber: { $regex: search, $options: "i" } }];
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filter.$and = [
                    { createAt: { $gte: new Date(dateFrom) } },
                    { createAt: { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filter["createAt"] = {
                    $gte: new Date(dateFrom),
                };
            } else if (dateTo && dateTo !== "") {
                filter["createdAt"] = { $lte: new Date(dateTo) };
            }

            const orders = await B2COrder.find(filter)
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

            const totalOrder = await B2COrder.find({ user: req.user?._id }).count();

            res.status(200).json({
                orders,
                totalOrder,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleOrder: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) return sendErrorResponse(res, 400, "invalid order id");

            const b2cOrder = await B2COrder.findById(id)
                .populate("user")
                .select({
                    baseFare: 0,
                    profit: 0,
                })
                .lean();

            if (!b2cOrder) return sendErrorResponse(res, 400, "order not found!");

            if (b2cOrder?.isAttraction) {
                const attractionOrder = await AttractionOrder.findById(b2cOrder?.attractionId)
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
                        "activities._id activities.grandTotal activities.activity activities.date activities.adultsCount activities.childrenCount activities.infantCount activities.childTickets activities.adultTickets activities.infantTickets activities.transferType  activities.status  totalAmount orderStatus paymentState"
                    )
                    .exec();

                b2cOrder.attractionOrder = attractionOrder;
            }

            if (b2cOrder?.isTransfer) {
                const transferOrder = await B2CTransferOrder.findById({ _id: b2cOrder?.transferId })
                    .populate("journey.trips.vehicleTypes.vehicleId")
                    .select(
                        "journey.transferType journey._id journey.noOfAdults journey.noOfChildrens journey.trips journey.netPrice netFare paymentState"
                    )
                    .exec();

                b2cOrder.transferOrder = transferOrder;
            }

            res.status(200).json(b2cOrder);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    // Download b2c order invoice
    downloadOrderInvoice: async (req, res) => {
        try {
            const { orderId } = req.params;
            if (!isValidObjectId(orderId)) return sendErrorResponse(res, 400, "invalid order id");

            const b2cOrder = await B2COrder.findOne({
                _id: orderId,
            })
                .select("_id status")
                .lean();

            if (!b2cOrder) return sendErrorResponse(res, 400, "order not found");

            if (b2cOrder.status === "pending")
                return sendErrorResponse(res, 400, "sorry, order not completed");

            // b2c order pdf creation
            const pdfBuffer = await b2cOrderInvoice({
                orderId,
                user: req.user?._id,
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

    getSingleB2cAllOrdersSheet: async (req, res) => {
        try {
            await generateB2cOrderSheet({
                ...req.query,
                res,
                user: req.user?._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    cancelB2cOrder: async (req, res) => {
        try {
            const { orderId, attractionCancellations, transferCancellations, cancellationRemark } =
                req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const b2cOrder = await B2COrder.findOne({ _id: orderId });

            if (!b2cOrder) {
                return sendErrorResponse(res, 404, "order  not found");
            }

            let prevOrderCancellation = await B2COrderCancellation.findOne({
                orderId,
                $or: [
                    { cancellationStatus: "pending", cancelledBy: "b2c" },
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

            if (b2cOrder.attractionId && attractionCancellations.length > 0) {
                const attractionOrder = await AttractionOrder.findOne({
                    _id: b2cOrder.attractionId,
                    // reseller: req.reseller?._id,
                })
                    .populate("user", "_id  name email")
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

                    let orderCancellation = await B2CAttractionOrderCancellation.findOne({
                        orderId: b2cOrder.attractionId,
                        activityId,
                        userId: attractionOrder.user?._id,
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
                        orderCancellation = await B2CAttractionOrderCancellation.create({
                            cancellationRemark,
                            cancellationStatus: "pending",
                            orderId: b2cOrder.attractionId,
                            userId: attractionOrder.user?._id,
                            cancelledBy: "b2c",
                            activityId,
                            activity: orderDetail?.activity?._id,
                            activityName: orderDetail?.activity?.name,
                        });
                    }

                    await orderCancellation.save();
                }
            }

            if (b2cOrder.transferId && transferCancellations.length > 0) {
                const transferOrder = await B2CTransferOrder.findOne({
                    _id: b2cOrder?.transferId,
                    // reseller: req.reseller?._id,
                }).populate("user", "_id  name email ");

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

                    let orderCancellation = await B2CTransferOrderCancellation.findOne({
                        orderId: b2cOrder.transferId,
                        transferId,
                        userId: transferOrder.user?._id,
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
                        orderCancellation = await B2CTransferOrderCancellation.create({
                            cancellationRemark,
                            cancellationStatus: "pending",
                            orderId: b2cOrder.transferId,
                            userId: transferOrder.user?._id,
                            cancelledBy: "b2c",
                            transferId,
                        });
                    }

                    await orderCancellation.save();
                }
            }

            let orderCancellation = await B2COrderCancellation.create({
                cancellationRemark,
                cancellationStatus: "pending",
                orderId,
                userId: b2cOrder?.user,
                cancelledBy: "b2c",
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
