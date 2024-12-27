const { isValidObjectId, Types } = require("mongoose");
const xl = require("excel4node");
const moment = require("moment");
const {
    B2BOrder,
    B2BAttractionOrder,
    B2BTransferOrder,
    B2BOrderPayment,
    B2BAttractionOrderCancellation,
    B2BTransferOrderCancellation,
    B2BTransferOrderRefund,
    B2BWallet,
    B2BTransaction,
    B2BOrderCancellation,
    B2BOrderRefund,
} = require("../../../b2b/models");
const { formatDate } = require("../../../utils");
const { sendErrorResponse } = require("../../../helpers");
const {
    B2BAttractionOrderPayment,
    B2BAttractionOrderRefund,
} = require("../../../b2b/models/attraction");
const {
    B2COrder,
    AttractionOrder,
    B2CTransferOrder,
    B2COrderPayment,
    B2CAttractionOrderRefund,
    B2CAttractionOrderPayment,
    B2CAttractionOrderCancellation,
    B2CTransferOrderCancellation,
    B2CTransferOrderRefund,
    B2COrderCancellation,
    B2COrderRefund,
} = require("../../../models");
const b2bOrderInvoice = require("../../../b2b/helpers/order/b2bOrderInvoice");
const b2cOrderInvoice = require("../../../helpers/orders/b2cOrderInvoiceHelper");
const { activityCancellationHelper } = require("../../helpers/attraction/attractionOrderHelper");
const { addMoneyToB2bWallet } = require("../../../b2b/utils/wallet");
const { b2bOrderCancellationSchema } = require("../../../b2b/validations/order/b2bOrder.schema");

module.exports = {
    getAllOrders: async (req, res) => {
        try {
            const {
                referenceNo,
                agentCode,
                orderDateFrom,
                orderDateTo,
                orderStatus,
                traveller,
                skip = 0,
                limit = 10,
                resellerId,
            } = req.query;

            const filters1 = {};
            const filters2 = {};

            if (referenceNo) {
                filters1["referenceNumber"] = referenceNo;
            }

            if (orderStatus) {
                filters1["orderStatus"] = orderStatus;
            }

            if (traveller) {
                filters1.$or = [
                    { email: { $regex: traveller, $options: "i" } },
                    { name: { $regex: traveller, $options: "i" } },
                ];
            }

            if (orderDateFrom && orderDateTo) {
                filters1.$and = [
                    { createdAt: { $gte: moment(orderDateFrom).startOf("day").toDate() } },
                    { createdAt: { $lte: moment(orderDateTo).startOf("day").toDate() } },
                ];
            } else if (orderDateFrom) {
                filters1["createdAt"] = {
                    $gte: moment(orderDateFrom).startOf("day").toDate(),
                };
            } else if (orderDateTo) {
                filters1["createdAt"] = { $lte: moment(orderDateTo).startOf("day").toDate() };
            }

            if (agentCode && agentCode !== "") {
                filters2["reseller.agentCode"] = Number(agentCode);
            }

            if (resellerId) {
                filters1.reseller = Types.ObjectId(resellerId);
            }

            const orders = await B2BOrder.aggregate([
                { $match: filters1 },
                {
                    $lookup: {
                        from: "resellers",
                        localField: "reseller",
                        foreignField: "_id",
                        as: "reseller",
                        pipeline: [{ $project: { companyName: 1, agentCode: 1 } }],
                    },
                },
                { $match: filters2 },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "countries",
                        localField: "country",
                        foreignField: "_id",
                        as: "country",
                    },
                },
                {
                    $set: {
                        country: { $arrayElemAt: ["$country", 0] },
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                    },
                },
                {
                    $project: {
                        referenceNumber: 1,
                        agentReferenceNumber: 1,
                        orderStatus: 1,
                        paymentState: 1,
                        name: 1,
                        email: 1,
                        country: 1,
                        phoneNumber: 1,
                        createdAt: 1,
                        reseller: 1,
                        netPrice: 1,
                        isViewed: 1,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalOrders: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                totalOrders: orders[0]?.totalOrders || 0,
                skip: Number(skip),
                limit: Number(limit),
                orders: orders[0]?.data || [],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleB2bOrder: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "Invalid transfer id");
            }

            const b2bOrder = await B2BOrder.findById(orderId).populate("reseller").lean();

            if (!b2bOrder) {
                return sendErrorResponse(res, 400, "No  order found ");
            }

            if (b2bOrder?.isAttraction) {
                const attractionOrder = await B2BAttractionOrder.findById(b2bOrder?.attractionId)
                    .populate("reseller", "name companyName agentCode email")
                    .populate("country", "phonecode")
                    .populate("activities.activity", "name")
                    .populate("activities.attraction", "title images")
                    .lean();

                const payments = await B2BAttractionOrderPayment.find({
                    orderId: attractionOrder._id,
                })
                    .sort({ createdAt: -1 })
                    .lean();
                const cancellations = await B2BAttractionOrderCancellation.find({
                    orderId: attractionOrder._id,
                })
                    .populate("adminId", "name")
                    .sort({ createdAt: -1 })
                    .lean();
                const refunds = await B2BAttractionOrderRefund.find({
                    orderId: attractionOrder._id,
                })
                    .sort({ createdAt: -1 })
                    .lean();

                b2bOrder.attractionOrder = attractionOrder;
                b2bOrder.attractionOrder.cancellations = cancellations || [];
                b2bOrder.attractionOrder.refunds = refunds || [];
            }

            if (b2bOrder?.isTransfer) {
                const transferOrder = await B2BTransferOrder.findById(b2bOrder.transferId)
                    .populate("journey.trips.vehicleTypes.vehicleId")
                    .lean();

                console.log(transferOrder);
                const cancellations = await B2BTransferOrderCancellation.find({
                    orderId: transferOrder._id,
                })
                    .populate("adminId", "name")
                    .sort({ createdAt: -1 })
                    .lean();
                const refunds = await B2BTransferOrderRefund.find({
                    orderId: transferOrder._id,
                })
                    .sort({ createdAt: -1 })
                    .lean();

                b2bOrder.transferOrder = transferOrder;
                b2bOrder.transferOrder.cancellations = cancellations || [];
                b2bOrder.transferOrder.refunds = refunds || [];
            }

            const payments = await B2BOrderPayment.find({ orderId }).sort({ createdAt: -1 }).lean();
            const cancellations = await B2BOrderCancellation.find({
                orderId,
            })
                .populate("adminId", "name")
                .sort({ createdAt: -1 })
                .lean();
            const refunds = await B2BOrderRefund.find({
                orderId,
            })
                .sort({ createdAt: -1 })
                .lean();
            res.status(200).json({ order: b2bOrder, payments, cancellations, refunds });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },
    getAllB2cOrders: async (req, res) => {
        try {
            const {
                userId,
                referenceNo,
                agentCode,
                orderDateFrom,
                orderDateTo,
                orderStatus,
                traveller,
                skip = 0,
                limit = 10,
            } = req.query;

            const filters1 = {};
            const filters2 = {};

            if (referenceNo) {
                filters1["referenceNumber"] = referenceNo;
            }

            if (orderStatus) {
                filters1["orderStatus"] = orderStatus;
            }

            if (traveller) {
                filters1.$or = [
                    { email: { $regex: traveller, $options: "i" } },
                    { name: { $regex: traveller, $options: "i" } },
                ];
            }

            if (orderDateFrom && orderDateTo) {
                filters1.$and = [
                    { createdAt: { $gte: moment(orderDateFrom).startOf("day").toDate() } },
                    { createdAt: { $lte: moment(orderDateTo).startOf("day").toDate() } },
                ];
            } else if (orderDateFrom) {
                filters1["createdAt"] = {
                    $gte: moment(orderDateFrom).startOf("day").toDate(),
                };
            } else if (orderDateTo) {
                filters1["createdAt"] = { $lte: moment(orderDateTo).startOf("day").toDate() };
            }
            console.log(filters1, userId);

            if (userId) {
                filters1.user = Types.ObjectId(userId);
            }

            const orders = await B2COrder.aggregate([
                { $match: filters1 },
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "user",
                        pipeline: [{ $project: { name: 1, email: 1 } }],
                    },
                },
                { $match: filters2 },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "countries",
                        localField: "country",
                        foreignField: "_id",
                        as: "country",
                    },
                },
                {
                    $set: {
                        country: { $arrayElemAt: ["$country", 0] },
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                    },
                },
                {
                    $project: {
                        referenceNumber: 1,
                        agentReferenceNumber: 1,
                        orderStatus: 1,
                        paymentState: 1,
                        name: 1,
                        email: 1,
                        country: 1,
                        phoneNumber: 1,
                        createdAt: 1,
                        reseller: 1,
                        netPrice: 1,
                        isViewed: 1,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalOrders: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                totalOrders: orders[0]?.totalOrders || 0,
                skip: Number(skip),
                limit: Number(limit),
                orders: orders[0]?.data || [],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleB2cOrder: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "Invalid transfer id");
            }

            const b2cOrder = await B2COrder.findById(orderId).populate("user").lean();

            if (!b2cOrder) {
                return sendErrorResponse(res, 400, "No  order found ");
            }

            if (b2cOrder?.isAttraction) {
                const attractionOrder = await AttractionOrder.findById(b2cOrder?.attractionId)
                    .populate("user", "name companyName agentCode email")
                    .populate("country", "phonecode")
                    .populate("activities.activity", "name")
                    .populate("activities.attraction", "title images")
                    .lean();

                const payments = await B2CAttractionOrderPayment.find({
                    orderId: attractionOrder._id,
                })
                    .sort({ createdAt: -1 })
                    .lean();
                const cancellations = await B2CAttractionOrderCancellation.find({
                    orderId: attractionOrder._id,
                })
                    .populate("adminId", "name")
                    .sort({ createdAt: -1 })
                    .lean();
                const refunds = await B2CAttractionOrderRefund.find({
                    orderId: attractionOrder._id,
                })
                    .sort({ createdAt: -1 })
                    .lean();

                b2cOrder.attractionOrder = attractionOrder;
                b2cOrder.attractionOrder.payments = payments || [];
                b2cOrder.attractionOrder.cancellations = cancellations || [];
                b2cOrder.attractionOrder.refunds = refunds || [];
            }

            if (b2cOrder?.isTransfer) {
                const transferOrder = await B2CTransferOrder.findById(b2cOrder.transferId)
                    .populate("journey.trips.vehicleTypes.vehicleId")
                    // .exec();
                    .lean();

                const cancellations = await B2CTransferOrderCancellation.find({
                    orderId: transferOrder._id,
                })
                    .populate("adminId", "name")
                    .sort({ createdAt: -1 })
                    .lean();
                const refunds = await B2CTransferOrderRefund.find({
                    orderId: transferOrder._id,
                })
                    .sort({ createdAt: -1 })
                    .lean();

                b2cOrder.transferOrder = transferOrder;
                b2cOrder.transferOrder.cancellations = cancellations || [];
                b2cOrder.transferOrder.refunds = refunds || [];
            }

            const payments = await B2COrderPayment.find({ orderId }).sort({ createdAt: -1 }).lean();

            res.status(200).json({ order: b2cOrder, payments });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    downloadB2bOrderInvoice: async (req, res) => {
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

            if (b2bOrder.status === "pending") {
                return sendErrorResponse(res, 400, "sorry, transfer order not completed");
            }

            const pdfBuffer = await b2bOrderInvoice({
                orderId,
                resellerId: b2bOrder.reseller,
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
    downloadB2cOrderInvoice: async (req, res) => {
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
                user: b2cOrder?._id,
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
    newOrderCount: async (req, res) => {
        try {
            const b2bOrderCount = await B2BOrder.find({
                orderStatus: "completed",
                isViewed: false,
            }).count();
            const b2cOrderCount = await B2COrder.find({
                orderStatus: "completed",
                isViewed: false,
            }).count();
            const b2bCancellationOrderCount = await B2BOrder.aggregate([
                {
                    $lookup: {
                        from: "b2battractioncancellations",
                        localField: "attractionId",
                        foreignField: "orderId",
                        as: "attractionOrdersCancellation",
                    },
                },
                {
                    $lookup: {
                        from: "b2btransferordercancellations",
                        localField: "transferId",
                        foreignField: "orderId",
                        as: "transferOrdersCancellation",
                    },
                },
                {
                    $match: {
                        $expr: {
                            $or: [
                                { $ne: [{ $size: "$attractionOrdersCancellation" }, 0] },
                                { $ne: [{ $size: "$transferOrdersCancellation" }, 0] },
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        isNew: {
                            $cond: {
                                if: {
                                    $anyElementTrue: {
                                        $map: {
                                            input: {
                                                $concatArrays: [
                                                    "$attractionOrdersCancellation",
                                                    "$transferOrdersCancellation",
                                                ],
                                            },
                                            as: "order",
                                            in: {
                                                $eq: ["$$order.cancellationStatus", "pending"],
                                            },
                                        },
                                    },
                                },
                                then: true,
                                else: false,
                            },
                        },
                    },
                },
                {
                    $match: {
                        isNew: true, // Filtering documents where isNew is true
                    },
                },
                {
                    $project: {
                        referenceNumber: 1,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        totalOrders: 1,
                    },
                },
            ]);
            res.status(200).send({
                b2bOrderCount: b2bOrderCount,
                b2cOrderCount,
                b2bCancellationOrderCount: b2bCancellationOrderCount[0]?.totalOrders || 0,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    orderViewStatusChange: async (req, res) => {
        try {
            const { id } = req.params;
            const { type } = req.body;
            if (type === "b2b") {
                const b2bOrder = await B2BOrder.findByIdAndUpdate(id, {
                    isViewed: true,
                });
            } else if (type === "b2c") {
                const b2cOrder = await B2COrder.findByIdAndUpdate(id, {
                    isViewed: true,
                });
            }

            res.status(200).json({ message: "status changed" });
        } catch (err) {}
    },

    getAllCancelledOrders: async (req, res) => {
        try {
            const {
                referenceNo,
                agentCode,
                orderDateFrom,
                orderDateTo,
                orderStatus,
                traveller,
                skip = 0,
                limit = 10,
                resellerId,
            } = req.query;

            const filters1 = {};
            const filters2 = {};

            if (referenceNo) {
                filters1["referenceNumber"] = referenceNo;
            }

            if (orderStatus) {
                filters1["orderStatus"] = orderStatus;
            }

            if (traveller) {
                filters1.$or = [
                    { email: { $regex: traveller, $options: "i" } },
                    { name: { $regex: traveller, $options: "i" } },
                ];
            }

            if (orderDateFrom && orderDateTo) {
                filters1.$and = [
                    { createdAt: { $gte: moment(orderDateFrom).startOf("day").toDate() } },
                    { createdAt: { $lte: moment(orderDateTo).startOf("day").toDate() } },
                ];
            } else if (orderDateFrom) {
                filters1["createdAt"] = {
                    $gte: moment(orderDateFrom).startOf("day").toDate(),
                };
            } else if (orderDateTo) {
                filters1["createdAt"] = { $lte: moment(orderDateTo).startOf("day").toDate() };
            }

            if (agentCode && agentCode !== "") {
                filters2["reseller.agentCode"] = Number(agentCode);
            }

            if (resellerId) {
                filters1.reseller = Types.ObjectId(resellerId);
            }

            const orders = await B2BOrder.aggregate([
                { $match: filters1 },
                {
                    $lookup: {
                        from: "resellers",
                        localField: "reseller",
                        foreignField: "_id",
                        as: "reseller",
                        pipeline: [{ $project: { companyName: 1, agentCode: 1 } }],
                    },
                },

                { $match: filters2 },
                {
                    $lookup: {
                        from: "b2battractioncancellations",
                        localField: "attractionId",
                        foreignField: "orderId",
                        as: "attractionOrdersCancellation",
                    },
                },
                {
                    $lookup: {
                        from: "b2btransferordercancellations",
                        localField: "transferId",
                        foreignField: "orderId",
                        as: "transferOrdersCancellation",
                    },
                },
                {
                    $match: {
                        $expr: {
                            $or: [
                                { $ne: [{ $size: "$attractionOrdersCancellation" }, 0] },
                                { $ne: [{ $size: "$transferOrdersCancellation" }, 0] },
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        isNew: {
                            $anyElementTrue: {
                                $map: {
                                    input: {
                                        $concatArrays: [
                                            "$attractionOrdersCancellation",
                                            "$transferOrdersCancellation",
                                        ],
                                    },
                                    as: "order",
                                    in: { $eq: ["$$order.cancellationStatus", "pending"] },
                                },
                            },
                        },
                    },
                },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "countries",
                        localField: "country",
                        foreignField: "_id",
                        as: "country",
                    },
                },
                {
                    $set: {
                        country: { $arrayElemAt: ["$country", 0] },
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                    },
                },
                {
                    $project: {
                        referenceNumber: 1,
                        agentReferenceNumber: 1,
                        orderStatus: 1,
                        paymentState: 1,
                        name: 1,
                        email: 1,
                        country: 1,
                        phoneNumber: 1,
                        createdAt: 1,
                        reseller: 1,
                        netPrice: 1,
                        isViewed: 1,
                        isNew: 1,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalOrders: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                totalOrders: orders[0]?.totalOrders || 0,
                skip: Number(skip),
                limit: Number(limit),
                orders: orders[0]?.data || [],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    cancelB2bOrder: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { attractionCancellations, transferCancellations, cancellationRemark } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const { _, error } = b2bOrderCancellationSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
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

            console.log(prevOrderCancellation, "prevOrderCancellation");

            if (prevOrderCancellation) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry, there is already a pending request or approved cancellation request."
                );
            }

            let orderCancellation = await B2BOrderCancellation.create({
                cancellationRemark,
                cancellationStatus: "pending",
                orderId,
                resellerId: b2bOrder?.reseller,
                cancelledBy: "admin",
            });

            let refundAmount = 0;
            let totalCancellationCharge = 0;
            if (b2bOrder.attractionId && attractionCancellations.length > 0) {
                const attractionOrder = await B2BAttractionOrder.findOne({
                    _id: b2bOrder.attractionId,
                })
                    .populate("reseller", "name email")
                    .populate({
                        path: "activities.attraction",
                        select: "id title isApiConnected",
                    })
                    .populate({
                        path: "activities.activity",
                        select: "id name ",
                    });

                if (!attractionOrder) {
                    return sendErrorResponse(res, 404, "attraction order not found");
                }

                for (let i = 0; i < attractionCancellations.length; i++) {
                    let activityId = attractionCancellations[i].id;
                    let cancellationCharge = attractionCancellations[i].charge;

                    const actOrder = attractionOrder.activities.find((activity) => {
                        return activity._id.toString() === activityId.toString() && activity;
                    });

                    if (!actOrder) {
                        return sendErrorResponse(res, 404, "activity  not found");
                    }

                    if (actOrder.status === "cancelled") {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, this order is already cancelled."
                        );
                    }
                    if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
                        return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
                    }

                    if (Number(cancellationCharge) > actOrder.netPrice) {
                        return sendErrorResponse(
                            res,
                            400,
                            "cancellation charge is greater than net price"
                        );
                    }

                    let prevOrderCancellation = await B2BAttractionOrderCancellation.findOne({
                        orderId: b2bOrder?.attractionId,
                        activityId: activityId,
                        $or: [
                            { cancellationStatus: "pending", cancelledBy: "b2b" },
                            { cancellationStatus: "success" },
                        ],
                    });

                    console.log(prevOrderCancellation, "prevOrderCancellation");

                    if (prevOrderCancellation) {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, there is already a pending request or approved cancellation request."
                        );
                    }

                    let orderCancellation = await B2BAttractionOrderCancellation.create({
                        cancellationRemark,
                        cancellationStatus: "pending",
                        orderId: attractionOrder._id,
                        resellerId: attractionOrder?.reseller?._id,
                        cancelledBy: "admin",
                        activityId,
                        activity: actOrder.activity._id,
                        activityName: actOrder.activity.name,
                    });

                    await activityCancellationHelper({ activity: actOrder });

                    orderCancellation.cancellationStatus = "success";
                    orderCancellation.cancellationCharge = cancellationCharge;
                    orderCancellation.cancellationRemark = cancellationRemark;
                    orderCancellation.adminId = req.admin?._id;
                    await orderCancellation.save();
                    await B2BAttractionOrder.findOneAndUpdate(
                        {
                            _id: attractionOrder._id,
                            "activities._id": activityId,
                        },
                        {
                            "activities.$.status": "cancelled",
                            "activities.$.note": cancellationRemark,
                        },
                        { runValidators: true }
                    );
                    let attractionRefundAmount = actOrder.grandTotal - Number(cancellationCharge);

                    if (attractionRefundAmount > 0) {
                        let attOrderRefund = await B2BAttractionOrderRefund.create({
                            amount: attractionRefundAmount,
                            note: "Attraction order cancelled by admin",
                            orderId: attractionOrder._id,
                            paymentMethod: "wallet",
                            resellerId: attractionOrder?.reseller,
                            status: "pending",
                            activityId,
                            activity: actOrder.activity._id,
                            activityName: actOrder.activity.name,
                        });

                        attOrderRefund.status = "success";
                        await attOrderRefund.save();
                    }

                    refundAmount += attractionRefundAmount;
                    totalCancellationCharge += cancellationCharge;
                }
            }

            if (b2bOrder.transferId && transferCancellations.length > 0) {
                const transferOrder = await B2BTransferOrder.findOne({
                    _id: b2bOrder.transferId,
                }).populate("reseller", "name email");

                if (!transferOrder) {
                    return sendErrorResponse(res, 404, "transfer order not found");
                }
                for (let i = 0; i < transferCancellations.length; i++) {
                    let transferId = transferCancellations[i].id;
                    let cancellationCharge = transferCancellations[i].charge;
                    const transOrder = transferOrder.journey.find((journ) => {
                        return journ._id.toString() === transferId.toString() && journ;
                    });

                    if (!transOrder) {
                        return sendErrorResponse(res, 404, "journey  not found");
                    }

                    if (transOrder.status === "cancelled") {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, this order is already cancelled."
                        );
                    }
                    if (transOrder.status !== "booked" && transOrder.status !== "confirmed") {
                        return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
                    }

                    if (Number(cancellationCharge) > transOrder.netPrice) {
                        return sendErrorResponse(
                            res,
                            400,
                            "cancellation charge is greater than net price"
                        );
                    }

                    let prevOrderCancellation = await B2BTransferOrderCancellation.findOne({
                        orderId: b2bOrder.transferId,
                        transferId,
                        $or: [
                            { cancellationStatus: "pending", cancelledBy: "b2b" },
                            { cancellationStatus: "success" },
                        ],
                    });
                    if (prevOrderCancellation) {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, there is already a pending or approved cancellation request."
                        );
                    }

                    let orderCancellation = await B2BTransferOrderCancellation.create({
                        cancellationRemark,
                        cancellationStatus: "pending",
                        orderId: b2bOrder.transferId,
                        resellerId: transferOrder?.reseller?._id,
                        cancelledBy: "admin",
                        transferId: transferId,
                        // transferName: transOrder.activity.name,
                    });

                    orderCancellation.cancellationStatus = "success";
                    orderCancellation.cancellationCharge = cancellationCharge;
                    orderCancellation.cancellationRemark = cancellationRemark;
                    orderCancellation.adminId = req.admin?._id;
                    await orderCancellation.save();
                    await B2BTransferOrder.findOneAndUpdate(
                        {
                            _id: b2bOrder.transferId,
                            "journey._id": transferId,
                        },
                        {
                            "journey.$.status": "cancelled",
                            "journey.$.note": cancellationRemark,
                        },
                        { runValidators: true }
                    );
                    let transferRefundAmount = transOrder.netPrice - Number(cancellationCharge);

                    if (transferRefundAmount > 0) {
                        let transferOrderRefund = await B2BTransferOrderRefund.create({
                            amount: transferRefundAmount,
                            note: "Transfer order cancelled by admin",
                            orderId: b2bOrder.transferId,
                            paymentMethod: "wallet",
                            resellerId: transferOrder?.reseller,
                            status: "pending",
                            transferId: transferId,
                        });

                        transferOrderRefund.status = "success";
                        await transferOrderRefund.save();
                    }

                    refundAmount += transferRefundAmount;
                    totalCancellationCharge += cancellationCharge;
                }
            }

            let wallet = await B2BWallet.findOne({
                reseller: b2bOrder.reseller,
            });
            if (!wallet) {
                wallet = new B2BWallet({
                    balance: refundAmount,
                    reseller: b2bOrder.reseller,
                });
                await wallet.save();
            } else {
                await addMoneyToB2bWallet(wallet, refundAmount);
            }

            orderCancellation.cancellationStatus = "success";
            orderCancellation.cancellationCharge = totalCancellationCharge;
            orderCancellation.cancellationRemark = cancellationRemark;
            orderCancellation.adminId = req.admin?._id;
            await orderCancellation.save();

            await B2BOrder.findOneAndUpdate(
                {
                    _id: orderId,
                },
                {
                    orderStatus: "partially-cancelled",
                },
                { runValidators: true }
            );

            if (refundAmount > 0) {
                let orderRefund = await B2BOrderRefund.create({
                    amount: refundAmount,
                    note: "order cancelled by admin",
                    orderId,
                    paymentMethod: "wallet",
                    resellerId: b2bOrder?.reseller,
                    status: "pending",
                });

                orderRefund.status = "success";
                await orderRefund.save();
            }

            await B2BTransaction.create({
                reseller: b2bOrder.reseller,
                paymentProcessor: "wallet",
                product: "all",
                processId: b2bOrder?._id,
                description: ` cancellation refund`,
                debitAmount: 0,
                creditAmount: refundAmount,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "cancellation refund",
                dateTime: new Date(),
            });

            res.status(200).json({
                message: "order cancellation  successfully submitted.",
                orderId: orderId,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    // approveOrderB2bCancellationRequest: async (req, res) => {
    //     try {
    //         const { cancellationId } = req.params;
    //         const { attractionCancellations, transferCancellations, cancellationRemark } = req.body;

    //         if (!isValidObjectId(cancellationId)) {
    //             return sendErrorResponse(res, 400, "invalid cancellation id");
    //         }

    //         const { _, error } = b2bOrderCancellationSchema.validate(req.body);
    //         if (error) {
    //             return sendErrorResponse(res, 400, error.details[0].message);
    //         }

    //         let orderCancellation = await B2BOrderCancellation.findById(cancellationId);
    //         if (!orderCancellation) {
    //             return sendErrorResponse(res, 404, "cancellation request is not found");
    //         }

    //         if (orderCancellation.cancellationStatus !== "pending") {
    //             return sendErrorResponse(
    //                 res,
    //                 404,
    //                 "cancellation request is already completed or failed"
    //             );
    //         }
    //         const b2bOrder = await B2BOrder.findOne({
    //             _id: orderCancellation.orderId,
    //             reseller: orderCancellation.resellerId,
    //         }).populate("reseller", "name email");

    //         if (!b2bOrder) {
    //             return sendErrorResponse(res, 404, " order not found");
    //         }

    //         let refundAmount = 0;
    //         let totalCancellationCharge = 0;

    //         if (b2bOrder.attractionId && attractionCancellations.length > 0) {
    //             for (let i = 0; i < attractionCancellations.length; i++) {
    //                 let attractionCancellationId = attractionCancellations[i].cancellationId;
    //                 let cancellationCharge = attractionCancellations[i].charge;

    //                 let attOrderCancellation = await B2BAttractionOrderCancellation.findById(
    //                     attractionCancellationId
    //                 );

    //                 if (!attOrderCancellation) {
    //                     return sendErrorResponse(res, 404, "cancellation request is not found");
    //                 }

    //                 if (attOrderCancellation.cancellationStatus !== "pending") {
    //                     return sendErrorResponse(
    //                         res,
    //                         404,
    //                         "cancellation request is already completed or failed"
    //                     );
    //                 }

    //                 const attractionOrder = await B2BAttractionOrder.findOne({
    //                     _id: attOrderCancellation.orderId,
    //                     reseller: attOrderCancellation.resellerId,
    //                 })
    //                     .populate("reseller", "name email")
    //                     .populate({
    //                         path: "activities.attraction",
    //                         select: "id title isApiConnected",
    //                     })
    //                     .populate({
    //                         path: "activities.activity",
    //                         select: "id name ",
    //                     });

    //                 if (!attractionOrder) {
    //                     return sendErrorResponse(res, 404, "attraction order not found");
    //                 }

    //                 const actOrder = attractionOrder.activities.find((activity) => {
    //                     return (
    //                         activity._id.toString() ===
    //                             attOrderCancellation.activityId.toString() && activity
    //                     );
    //                 });

    //                 if (!actOrder) {
    //                     return sendErrorResponse(res, 404, "activity  not found");
    //                 }

    //                 if (actOrder.status === "cancelled") {
    //                     return sendErrorResponse(
    //                         res,
    //                         400,
    //                         "sorry, this order is already cancelled."
    //                     );
    //                 }
    //                 // if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
    //                 //     return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
    //                 // }

    //                 if (Number(cancellationCharge) > actOrder?.grandTotal) {
    //                     return sendErrorResponse(
    //                         res,
    //                         400,
    //                         "cancellation charge is greater than net price"
    //                     );
    //                 }

    //                 attOrderCancellation.cancellationStatus = "success";
    //                 attOrderCancellation.cancellationCharge = cancellationCharge;
    //                 attOrderCancellation.adminId = req.admin?._id;

    //                 await activityCancellationHelper({ activity: actOrder });
    //                 await attOrderCancellation.save();

    //                 await B2BAttractionOrder.findOneAndUpdate(
    //                     {
    //                         _id: attOrderCancellation.orderId,
    //                         "activities._id": attOrderCancellation.activityId,
    //                     },
    //                     {
    //                         "activities.$.status": "cancelled",
    //                         "activities.$.note": attOrderCancellation?.cancellationRemark,
    //                     },
    //                     { runValidators: true }
    //                 );
    //                 let attractionRefundAmount = actOrder.grandTotal - Number(cancellationCharge);

    //                 if (attractionRefundAmount > 0) {
    //                     let attOrderRefund = await B2BAttractionOrderRefund.create({
    //                         amount: attractionRefundAmount,
    //                         note: "Attraction order cancelled by admin",
    //                         orderId: attractionOrder._id,
    //                         paymentMethod: "wallet",
    //                         resellerId: attractionOrder?.reseller,
    //                         status: "pending",
    //                         activityId: attOrderCancellation.activityId,
    //                         activity: actOrder.activity._id,
    //                         activityName: actOrder.activity.name,
    //                     });

    //                     attOrderRefund.status = "success";
    //                     await attOrderRefund.save();
    //                 }

    //                 refundAmount += Number(attractionRefundAmount);
    //                 totalCancellationCharge += Number(cancellationCharge);
    //             }
    //         }

    //         if (b2bOrder.transferId && transferCancellations.length > 0) {
    //             for (let i = 0; i < transferCancellations.length; i++) {
    //                 let transferId = transferCancellations[i].cancellationId;
    //                 let cancellationCharge = transferCancellations[i].charge;

    //                 let transOrderCancellation = await B2BTransferOrderCancellation.findById(
    //                     transferId
    //                 );

    //                 if (!orderCancellation) {
    //                     return sendErrorResponse(res, 404, "cancellation request is not found");
    //                 }

    //                 if (orderCancellation.cancellationStatus !== "pending") {
    //                     return sendErrorResponse(
    //                         res,
    //                         404,
    //                         "cancellation request is already completed or failed"
    //                     );
    //                 }
    //                 const transferOrder = await B2BTransferOrder.findOne({
    //                     _id: transOrderCancellation.orderId,
    //                     reseller: transOrderCancellation.resellerId,
    //                 }).populate("reseller", "name email");

    //                 if (!transferOrder) {
    //                     return sendErrorResponse(res, 404, "transfer order not found");
    //                 }

    //                 const transOrder = transferOrder.journey.find((joun) => {
    //                     return (
    //                         joun._id.toString() === transOrderCancellation.transferId.toString() &&
    //                         joun
    //                     );
    //                 });

    //                 if (!transOrder) {
    //                     return sendErrorResponse(res, 404, "transfer  not found");
    //                 }

    //                 if (transOrder.status === "cancelled") {
    //                     return sendErrorResponse(
    //                         res,
    //                         400,
    //                         "sorry, this order is already cancelled."
    //                     );
    //                 }
    //                 // if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
    //                 //     return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
    //                 // }

    //                 if (Number(cancellationCharge) > transOrder?.netPrice) {
    //                     return sendErrorResponse(
    //                         res,
    //                         400,
    //                         "cancellation charge is greater than net price"
    //                     );
    //                 }

    //                 transOrderCancellation.cancellationStatus = "success";
    //                 transOrderCancellation.cancellationCharge = cancellationCharge;
    //                 transOrderCancellation.adminId = req.admin?._id;

    //                 await transOrderCancellation.save();
    //                 await B2BTransferOrder.findOneAndUpdate(
    //                     {
    //                         _id: transOrderCancellation.orderId,
    //                         "journey._id": transOrderCancellation?.transferId,
    //                     },
    //                     {
    //                         "journey.$.status": "cancelled",
    //                         "journey.$.note": orderCancellation?.cancellationRemark,
    //                     },
    //                     { runValidators: true }
    //                 );
    //                 let transferRefundAmount = transOrder.netPrice - Number(cancellationCharge);

    //                 if (transferRefundAmount > 0) {
    //                     let transferOrderRefund = await B2BTransferOrderRefund.create({
    //                         amount: transferRefundAmount,
    //                         note: "Transfer order cancelled by admin",
    //                         orderId: b2bOrder.transferId,
    //                         paymentMethod: "wallet",
    //                         resellerId: transferOrder?.reseller,
    //                         status: "pending",
    //                         transferId: transOrderCancellation?.transferId,
    //                     });

    //                     transferOrderRefund.status = "success";
    //                     await transferOrderRefund.save();
    //                 }

    //                 refundAmount += Number(transferRefundAmount);
    //                 totalCancellationCharge += Number(cancellationCharge);
    //             }
    //         }

    //         orderCancellation.cancellationStatus = "success";
    //         orderCancellation.cancellationCharge = totalCancellationCharge;
    //         orderCancellation.adminId = req.admin?._id;
    //         await orderCancellation.save();

    //         await B2BOrder.findOneAndUpdate(
    //             {
    //                 _id: orderCancellation.orderId,
    //             },
    //             {
    //                 orderStatus: "partially-cancelled",
    //             },
    //             { runValidators: true }
    //         );

    //         let orderRefund = await B2BOrderRefund.create({
    //             amount: refundAmount,
    //             note: "Order cancelled by admin",
    //             orderId: orderCancellation.orderId,
    //             paymentMethod: "wallet",
    //             resellerId: b2bOrder?.reseller,
    //             status: "pending",
    //         });

    //         let wallet = await B2BWallet.findOne({
    //             reseller: b2bOrder.reseller,
    //         });
    //         if (!wallet) {
    //             wallet = new B2BWallet({
    //                 balance: refundAmount,
    //                 reseller: b2bOrder.reseller,
    //             });
    //             await wallet.save();
    //         } else {
    //             await addMoneyToB2bWallet(wallet, refundAmount);
    //         }

    //         orderRefund.status = "success";
    //         await orderRefund.save();

    //         await B2BTransaction.create({
    //             reseller: b2bOrder.reseller,
    //             paymentProcessor: "wallet",
    //             product: "all",
    //             processId: b2bOrder?._id,
    //             description: `Order cancellation refund`,
    //             debitAmount: 0,
    //             creditAmount: refundAmount,
    //             directAmount: 0,
    //             closingBalance: wallet.balance,
    //             dueAmount: wallet.creditUsed,
    //             remark: "Order cancellation refund",
    //             dateTime: new Date(),
    //         });

    //         res.status(200).json({
    //             message: "order cancelled  successfully submitted.",
    //             orderId: b2bOrder._id,
    //         });
    //     } catch (err) {
    //         sendErrorResponse(res, 500, err);
    //     }
    // },
    approveOrderB2bCancellationRequest: async (req, res) => {
        try {
            const { cancellationId } = req.params;
            const { attractionCancellations, transferCancellations, cancellationRemark } = req.body;

            if (!isValidObjectId(cancellationId)) {
                return sendErrorResponse(res, 400, "invalid cancellation id");
            }

            const { _, error } = b2bOrderCancellationSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let orderCancellation = await B2BOrderCancellation.findById(cancellationId);
            if (!orderCancellation) {
                return sendErrorResponse(res, 404, "cancellation request is not found");
            }

            if (orderCancellation.cancellationStatus !== "pending") {
                return sendErrorResponse(
                    res,
                    404,
                    "cancellation request is already completed or failed"
                );
            }
            const b2bOrder = await B2BOrder.findOne({
                _id: orderCancellation.orderId,
                reseller: orderCancellation.resellerId,
            }).populate("reseller", "name email");

            if (!b2bOrder) {
                return sendErrorResponse(res, 404, " order not found");
            }

            let refundAmount = 0;
            let totalCancellationCharge = 0;

            if (b2bOrder.attractionId && attractionCancellations.length > 0) {
                for (let i = 0; i < attractionCancellations.length; i++) {
                    let activityId = attractionCancellations[i].id;

                    let cancellationCharge = attractionCancellations[i].charge;

                    let attOrderCancellation;
                    attOrderCancellation = await B2BAttractionOrderCancellation.findOne({
                        activityId,
                        orderId: b2bOrder.attractionId,
                    });

                    if (
                        attOrderCancellation &&
                        attOrderCancellation.cancellationStatus !== "pending"
                    ) {
                        return sendErrorResponse(
                            res,
                            404,
                            "cancellation request is already completed or failed"
                        );
                    }

                    const attractionOrder = await B2BAttractionOrder.findOne({
                        _id: b2bOrder.attractionId,
                        reseller: b2bOrder?.reseller?._id,
                    })
                        .populate("reseller", "name email")
                        .populate({
                            path: "activities.attraction",
                            select: "id title isApiConnected",
                        })
                        .populate({
                            path: "activities.activity",
                            select: "id name ",
                        });

                    if (!attractionOrder) {
                        return sendErrorResponse(res, 404, "attraction order not found");
                    }

                    const actOrder = attractionOrder.activities.find((activity) => {
                        return activity._id.toString() === activityId.toString() && activity;
                    });

                    if (!actOrder) {
                        return sendErrorResponse(res, 404, "activity  not found");
                    }

                    if (actOrder.status === "cancelled") {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, this order is already cancelled."
                        );
                    }

                    // if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
                    //     return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
                    // }

                    if (Number(cancellationCharge) > actOrder?.grandTotal) {
                        return sendErrorResponse(
                            res,
                            400,
                            "cancellation charge is greater than net price"
                        );
                    }
                    if (!attOrderCancellation) {
                        attOrderCancellation = await B2BAttractionOrderCancellation.create({
                            cancellationRemark,
                            cancellationStatus: "pending",
                            orderId: attractionOrder._id,
                            resellerId: attractionOrder?.reseller?._id,
                            cancelledBy: "admin",
                            activityId,
                            activity: actOrder.activity._id,
                            activityName: actOrder.activity.name,
                        });

                        await attOrderCancellation.save();
                    }

                    attOrderCancellation.cancellationStatus = "success";
                    attOrderCancellation.cancellationCharge = cancellationCharge;
                    attOrderCancellation.adminId = req.admin?._id;

                    await activityCancellationHelper({ activity: actOrder });
                    await attOrderCancellation.save();

                    await B2BAttractionOrder.findOneAndUpdate(
                        {
                            _id: attOrderCancellation.orderId,
                            "activities._id": attOrderCancellation.activityId,
                        },
                        {
                            "activities.$.status": "cancelled",
                            "activities.$.note": attOrderCancellation?.cancellationRemark,
                        },
                        { runValidators: true }
                    );
                    let attractionRefundAmount = actOrder.grandTotal - Number(cancellationCharge);

                    if (attractionRefundAmount > 0) {
                        let attOrderRefund = await B2BAttractionOrderRefund.create({
                            amount: attractionRefundAmount,
                            note: "Attraction order cancelled by admin",
                            orderId: attractionOrder._id,
                            paymentMethod: "wallet",
                            resellerId: attractionOrder?.reseller,
                            status: "pending",
                            activityId: attOrderCancellation.activityId,
                            activity: actOrder.activity._id,
                            activityName: actOrder.activity.name,
                        });

                        attOrderRefund.status = "success";
                        await attOrderRefund.save();
                    }

                    refundAmount += Number(attractionRefundAmount);
                    totalCancellationCharge += Number(cancellationCharge);
                }
            }

            if (b2bOrder.transferId && transferCancellations.length > 0) {
                for (let i = 0; i < transferCancellations.length; i++) {
                    let transferId = transferCancellations[i].id;
                    let cancellationCharge = transferCancellations[i].charge;

                    let transOrderCancellation;
                    transOrderCancellation = await B2BTransferOrderCancellation.findById({
                        transferId,
                        orderId: b2bOrder.transferId,
                    });

                    if (!transOrderCancellation) {
                        transOrderCancellation = await B2BTransferOrderCancellation.create({
                            cancellationRemark,
                            cancellationStatus: "pending",
                            orderId: b2bOrder.transferId,
                            resellerId: b2bOrder?.reseller?._id,
                            cancelledBy: "admin",
                            transferId: transferId,
                            // transferName: transOrder.activity.name,
                        });
                        await orderCancellation.save();
                    }

                    if (orderCancellation.cancellationStatus !== "pending") {
                        return sendErrorResponse(
                            res,
                            404,
                            "cancellation request is already completed or failed"
                        );
                    }
                    const transferOrder = await B2BTransferOrder.findOne({
                        _id: transOrderCancellation.orderId,
                        reseller: transOrderCancellation.resellerId,
                    }).populate("reseller", "name email");

                    if (!transferOrder) {
                        return sendErrorResponse(res, 404, "transfer order not found");
                    }

                    const transOrder = transferOrder.journey.find((joun) => {
                        return (
                            joun._id.toString() === transOrderCancellation.transferId.toString() &&
                            joun
                        );
                    });

                    if (!transOrder) {
                        return sendErrorResponse(res, 404, "transfer  not found");
                    }

                    if (transOrder.status === "cancelled") {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, this order is already cancelled."
                        );
                    }
                    // if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
                    //     return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
                    // }

                    if (Number(cancellationCharge) > transOrder?.netPrice) {
                        return sendErrorResponse(
                            res,
                            400,
                            "cancellation charge is greater than net price"
                        );
                    }

                    transOrderCancellation.cancellationStatus = "success";
                    transOrderCancellation.cancellationCharge = cancellationCharge;
                    transOrderCancellation.adminId = req.admin?._id;

                    await transOrderCancellation.save();
                    await B2BTransferOrder.findOneAndUpdate(
                        {
                            _id: transOrderCancellation.orderId,
                            "journey._id": transOrderCancellation?.transferId,
                        },
                        {
                            "journey.$.status": "cancelled",
                            "journey.$.note": orderCancellation?.cancellationRemark,
                        },
                        { runValidators: true }
                    );
                    let transferRefundAmount = transOrder.netPrice - Number(cancellationCharge);

                    if (transferRefundAmount > 0) {
                        let transferOrderRefund = await B2BTransferOrderRefund.create({
                            amount: transferRefundAmount,
                            note: "Transfer order cancelled by admin",
                            orderId: b2bOrder.transferId,
                            paymentMethod: "wallet",
                            resellerId: transferOrder?.reseller,
                            status: "pending",
                            transferId: transOrderCancellation?.transferId,
                        });

                        transferOrderRefund.status = "success";
                        await transferOrderRefund.save();
                    }

                    refundAmount += Number(transferRefundAmount);
                    totalCancellationCharge += Number(cancellationCharge);
                }
            }

            orderCancellation.cancellationStatus = "success";
            orderCancellation.cancellationCharge = totalCancellationCharge;
            orderCancellation.adminId = req.admin?._id;
            await orderCancellation.save();

            await B2BOrder.findOneAndUpdate(
                {
                    _id: orderCancellation.orderId,
                },
                {
                    orderStatus: "partially-cancelled",
                },
                { runValidators: true }
            );

            let orderRefund = await B2BOrderRefund.create({
                amount: refundAmount,
                note: "Order cancelled by admin",
                orderId: orderCancellation.orderId,
                paymentMethod: "wallet",
                resellerId: b2bOrder?.reseller,
                status: "pending",
            });

            let wallet = await B2BWallet.findOne({
                reseller: b2bOrder.reseller,
            });
            if (!wallet) {
                wallet = new B2BWallet({
                    balance: refundAmount,
                    reseller: b2bOrder.reseller,
                });
                await wallet.save();
            } else {
                await addMoneyToB2bWallet(wallet, refundAmount);
            }

            orderRefund.status = "success";
            await orderRefund.save();

            await B2BTransaction.create({
                reseller: b2bOrder.reseller,
                paymentProcessor: "wallet",
                product: "all",
                processId: b2bOrder?._id,
                description: `Order cancellation refund`,
                debitAmount: 0,
                creditAmount: refundAmount,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "Order cancellation refund",
                dateTime: new Date(),
            });

            res.status(200).json({
                message: "order cancelled  successfully submitted.",
                orderId: b2bOrder._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    cancelB2cOrder: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { attractionCancellations, transferCancellations, cancellationRemark } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const { _, error } = b2bOrderCancellationSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
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

            console.log(prevOrderCancellation, "prevOrderCancellation");

            if (prevOrderCancellation) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry, there is already a pending request or approved cancellation request."
                );
            }

            let orderCancellation = await B2COrderCancellation.create({
                cancellationRemark,
                cancellationStatus: "pending",
                orderId,
                userId: b2cOrder?.user,
                cancelledBy: "admin",
            });

            let refundAmount = 0;
            let totalCancellationCharge = 0;
            if (b2cOrder.attractionId && attractionCancellations.length > 0) {
                const attractionOrder = await B2BAttractionOrder.findOne({
                    _id: b2cOrder.attractionId,
                })
                    .populate("user", "name email")
                    .populate({
                        path: "activities.attraction",
                        select: "id title isApiConnected",
                    })
                    .populate({
                        path: "activities.activity",
                        select: "id name ",
                    });

                if (!attractionOrder) {
                    return sendErrorResponse(res, 404, "attraction order not found");
                }

                for (let i = 0; i < attractionCancellations.length; i++) {
                    let activityId = attractionCancellations[i].id;
                    let cancellationCharge = attractionCancellations[i].charge;

                    const actOrder = attractionOrder.activities.find((activity) => {
                        return activity._id.toString() === activityId.toString() && activity;
                    });

                    if (!actOrder) {
                        return sendErrorResponse(res, 404, "activity  not found");
                    }

                    if (actOrder.status === "cancelled") {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, this order is already cancelled."
                        );
                    }
                    if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
                        return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
                    }

                    if (Number(cancellationCharge) > actOrder.netPrice) {
                        return sendErrorResponse(
                            res,
                            400,
                            "cancellation charge is greater than net price"
                        );
                    }

                    let prevOrderCancellation = await B2BAttractionOrderCancellation.findOne({
                        orderId: b2cOrder?.attractionId,
                        activityId: activityId,
                        $or: [
                            { cancellationStatus: "pending", cancelledBy: "b2c" },
                            { cancellationStatus: "success" },
                        ],
                    });

                    console.log(prevOrderCancellation, "prevOrderCancellation");

                    if (prevOrderCancellation) {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, there is already a pending request or approved cancellation request."
                        );
                    }

                    let orderCancellation = await B2BAttractionOrderCancellation.create({
                        cancellationRemark,
                        cancellationStatus: "pending",
                        orderId: attractionOrder._id,
                        resellerId: attractionOrder?.user?._id,
                        cancelledBy: "admin",
                        activityId,
                        activity: actOrder.activity._id,
                        activityName: actOrder.activity.name,
                    });

                    await activityCancellationHelper({ activity: actOrder });

                    orderCancellation.cancellationStatus = "success";
                    orderCancellation.cancellationCharge = cancellationCharge;
                    orderCancellation.cancellationRemark = cancellationRemark;
                    orderCancellation.adminId = req.admin?._id;
                    await orderCancellation.save();
                    await AttractionOrder.findOneAndUpdate(
                        {
                            _id: attractionOrder._id,
                            "activities._id": activityId,
                        },
                        {
                            "activities.$.status": "cancelled",
                            "activities.$.note": cancellationRemark,
                        },
                        { runValidators: true }
                    );
                    let attractionRefundAmount = actOrder.grandTotal - Number(cancellationCharge);

                    if (attractionRefundAmount > 0) {
                        let attOrderRefund = await B2CAttractionOrderRefund.create({
                            amount: attractionRefundAmount,
                            note: "Attraction order cancelled by admin",
                            orderId: attractionOrder._id,
                            paymentMethod: "wallet",
                            userId: attractionOrder?.user,
                            status: "pending",
                            activityId,
                            activity: actOrder.activity._id,
                            activityName: actOrder.activity.name,
                        });

                        attOrderRefund.status = "success";
                        await attOrderRefund.save();
                    }

                    refundAmount += attractionRefundAmount;
                    totalCancellationCharge += cancellationCharge;
                }
            }

            if (b2cOrder.transferId && transferCancellations.length > 0) {
                const transferOrder = await B2CTransferOrder.findOne({
                    _id: b2cOrder.transferId,
                }).populate("user", "name email");

                if (!transferOrder) {
                    return sendErrorResponse(res, 404, "transfer order not found");
                }
                for (let i = 0; i < transferCancellations.length; i++) {
                    let transferId = transferCancellations[i].id;
                    let cancellationCharge = transferCancellations[i].charge;
                    const transOrder = transferOrder.journey.find((journ) => {
                        return journ._id.toString() === transferId.toString() && journ;
                    });

                    if (!transOrder) {
                        return sendErrorResponse(res, 404, "journey  not found");
                    }

                    if (transOrder.status === "cancelled") {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, this order is already cancelled."
                        );
                    }
                    if (transOrder.status !== "booked" && transOrder.status !== "confirmed") {
                        return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
                    }

                    if (Number(cancellationCharge) > transOrder.netPrice) {
                        return sendErrorResponse(
                            res,
                            400,
                            "cancellation charge is greater than net price"
                        );
                    }

                    let prevOrderCancellation = await B2BTransferOrderCancellation.findOne({
                        orderId: b2cOrder.transferId,
                        transferId,
                        $or: [
                            { cancellationStatus: "pending", cancelledBy: "b2c" },
                            { cancellationStatus: "success" },
                        ],
                    });
                    if (prevOrderCancellation) {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, there is already a pending or approved cancellation request."
                        );
                    }

                    let orderCancellation = await B2BTransferOrderCancellation.create({
                        cancellationRemark,
                        cancellationStatus: "pending",
                        orderId: b2cOrder.transferId,
                        userId: transferOrder?.user?._id,
                        cancelledBy: "admin",
                        transferId: transferId,
                        // transferName: transOrder.activity.name,
                    });

                    orderCancellation.cancellationStatus = "success";
                    orderCancellation.cancellationCharge = cancellationCharge;
                    orderCancellation.cancellationRemark = cancellationRemark;
                    orderCancellation.adminId = req.admin?._id;
                    await orderCancellation.save();
                    await B2BTransferOrder.findOneAndUpdate(
                        {
                            _id: b2cOrder.transferId,
                            "journey._id": transferId,
                        },
                        {
                            "journey.$.status": "cancelled",
                            "journey.$.note": cancellationRemark,
                        },
                        { runValidators: true }
                    );
                    let transferRefundAmount = transOrder.netPrice - Number(cancellationCharge);

                    if (transferRefundAmount > 0) {
                        let transferOrderRefund = await B2BTransferOrderRefund.create({
                            amount: transferRefundAmount,
                            note: "Transfer order cancelled by admin",
                            orderId: b2cOrder.transferId,
                            paymentMethod: "wallet",
                            userId: transferOrder?.uset,
                            status: "pending",
                            transferId: transferId,
                        });

                        transferOrderRefund.status = "success";
                        await transferOrderRefund.save();
                    }

                    refundAmount += transferRefundAmount;
                    totalCancellationCharge += cancellationCharge;
                }
            }

            orderCancellation.cancellationStatus = "success";
            orderCancellation.cancellationCharge = totalCancellationCharge;
            orderCancellation.cancellationRemark = cancellationRemark;
            orderCancellation.adminId = req.admin?._id;
            await orderCancellation.save();

            await B2COrder.findOneAndUpdate(
                {
                    _id: orderId,
                },
                {
                    orderStatus: "partially-cancelled",
                },
                { runValidators: true }
            );

            if (refundAmount > 0) {
                let orderRefund = await B2COrderRefund.create({
                    amount: refundAmount,
                    note: "order cancelled by admin",
                    orderId,
                    paymentMethod: "wallet",
                    userId: b2cOrder?.user,
                    status: "pending",
                });

                orderRefund.status = "success";
                await orderRefund.save();
            }

            await B2BTransaction.create({
                user: b2cOrder.user,
                paymentProcessor: "wallet",
                product: "all",
                processId: b2cOrder?._id,
                description: ` cancellation refund`,
                debitAmount: 0,
                creditAmount: refundAmount,
                directAmount: 0,
                remark: "cancellation refund",
                dateTime: new Date(),
            });

            res.status(200).json({
                message: "order cancellation  successfully submitted.",
                orderId: orderId,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    approveOrderB2cCancellationRequest: async (req, res) => {
        try {
            const { cancellationId } = req.params;
            const { attractionCancellations, transferCancellations, cancellationRemark } = req.body;

            if (!isValidObjectId(cancellationId)) {
                return sendErrorResponse(res, 400, "invalid cancellation id");
            }

            const { _, error } = b2bOrderCancellationSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let orderCancellation = await B2COrderCancellation.findById(cancellationId);
            if (!orderCancellation) {
                return sendErrorResponse(res, 404, "cancellation request is not found");
            }

            if (orderCancellation.cancellationStatus !== "pending") {
                return sendErrorResponse(
                    res,
                    404,
                    "cancellation request is already completed or failed"
                );
            }
            const b2cOrder = await B2COrder.findOne({
                _id: orderCancellation.orderId,
                user: orderCancellation.userId,
            }).populate("user", "name email");

            if (!b2cOrder) {
                return sendErrorResponse(res, 404, " order not found");
            }

            let refundAmount = 0;
            let totalCancellationCharge = 0;

            if (b2cOrder.attractionId && attractionCancellations.length > 0) {
                for (let i = 0; i < attractionCancellations.length; i++) {
                    let attractionCancellationId = attractionCancellations[i].cancellationId;
                    let cancellationCharge = attractionCancellations[i].charge;

                    let attOrderCancellation = await B2CAttractionOrderCancellation.findById(
                        attractionCancellationId
                    );

                    if (!attOrderCancellation) {
                        return sendErrorResponse(res, 404, "cancellation request is not found");
                    }

                    if (attOrderCancellation.cancellationStatus !== "pending") {
                        return sendErrorResponse(
                            res,
                            404,
                            "cancellation request is already completed or failed"
                        );
                    }

                    const attractionOrder = await AttractionOrder.findOne({
                        _id: attOrderCancellation.orderId,
                        user: attOrderCancellation.userId,
                    })
                        .populate("user", "name email")
                        .populate({
                            path: "activities.attraction",
                            select: "id title isApiConnected",
                        })
                        .populate({
                            path: "activities.activity",
                            select: "id name ",
                        });

                    if (!attractionOrder) {
                        return sendErrorResponse(res, 404, "attraction order not found");
                    }

                    const actOrder = attractionOrder.activities.find((activity) => {
                        return (
                            activity._id.toString() ===
                                attOrderCancellation.activityId.toString() && activity
                        );
                    });

                    if (!actOrder) {
                        return sendErrorResponse(res, 404, "activity  not found");
                    }

                    if (actOrder.status === "cancelled") {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, this order is already cancelled."
                        );
                    }
                    // if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
                    //     return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
                    // }

                    if (Number(cancellationCharge) > actOrder?.grandTotal) {
                        return sendErrorResponse(
                            res,
                            400,
                            "cancellation charge is greater than net price"
                        );
                    }

                    attOrderCancellation.cancellationStatus = "success";
                    attOrderCancellation.cancellationCharge = cancellationCharge;
                    attOrderCancellation.adminId = req.admin?._id;

                    await activityCancellationHelper({ activity: actOrder });
                    await attOrderCancellation.save();

                    await AttractionOrder.findOneAndUpdate(
                        {
                            _id: attOrderCancellation.orderId,
                            "activities._id": attOrderCancellation.activityId,
                        },
                        {
                            "activities.$.status": "cancelled",
                            "activities.$.note": attOrderCancellation?.cancellationRemark,
                        },
                        { runValidators: true }
                    );
                    let attractionRefundAmount = actOrder.grandTotal - Number(cancellationCharge);

                    if (attractionRefundAmount > 0) {
                        let attOrderRefund = await B2CAttractionOrderRefund.create({
                            amount: attractionRefundAmount,
                            note: "Attraction order cancelled by admin",
                            orderId: attractionOrder._id,
                            paymentMethod: "wallet",
                            userId: attractionOrder?.user,
                            status: "pending",
                            activityId,
                            activity: actOrder.activity._id,
                            activityName: actOrder.activity.name,
                        });

                        attOrderRefund.status = "success";
                        await attOrderRefund.save();
                    }

                    refundAmount += attractionRefundAmount;
                    totalCancellationCharge += cancellationCharge;
                }
            }

            if (b2cOrder.transferId && transferCancellations.length > 0) {
                for (let i = 0; i < transferCancellations.length; i++) {
                    let transferId = transferCancellations[i].cancellationId;
                    let cancellationCharge = transferCancellations[i].charge;

                    let transOrderCancellation = await B2CTransferOrderCancellation.findById(
                        transferId
                    );

                    if (!orderCancellation) {
                        return sendErrorResponse(res, 404, "cancellation request is not found");
                    }

                    if (orderCancellation.cancellationStatus !== "pending") {
                        return sendErrorResponse(
                            res,
                            404,
                            "cancellation request is already completed or failed"
                        );
                    }
                    const transferOrder = await B2CTransferOrder.findOne({
                        _id: transOrderCancellation.orderId,
                        user: transOrderCancellation.userId,
                    }).populate("user", "name email");

                    if (!transferOrder) {
                        return sendErrorResponse(res, 404, "transfer order not found");
                    }

                    const transOrder = transferOrder.journey.find((joun) => {
                        return (
                            joun._id.toString() === transOrderCancellation.transferId.toString() &&
                            joun
                        );
                    });

                    if (!transOrder) {
                        return sendErrorResponse(res, 404, "transfer  not found");
                    }

                    if (transOrder.status === "cancelled") {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, this order is already cancelled."
                        );
                    }
                    // if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
                    //     return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
                    // }

                    if (Number(cancellationCharge) > transOrder?.netPrice) {
                        return sendErrorResponse(
                            res,
                            400,
                            "cancellation charge is greater than net price"
                        );
                    }

                    transOrderCancellation.cancellationStatus = "success";
                    transOrderCancellation.cancellationCharge = cancellationCharge;
                    transOrderCancellation.adminId = req.admin?._id;

                    await transOrderCancellation.save();
                    await B2CTransferOrder.findOneAndUpdate(
                        {
                            _id: transOrderCancellation.orderId,
                            "journey._id": transOrderCancellation?.transferId,
                        },
                        {
                            "journey.$.status": "cancelled",
                            "journey.$.note": orderCancellation?.cancellationRemark,
                        },
                        { runValidators: true }
                    );
                    let transferRefundAmount = transOrder.netPrice - Number(cancellationCharge);

                    if (transferRefundAmount > 0) {
                        let transferOrderRefund = await B2BTransferOrderRefund.create({
                            amount: transferRefundAmount,
                            note: "Transfer order cancelled by admin",
                            orderId: b2cOrder.transferId,
                            paymentMethod: "wallet",
                            resellerId: transferOrder?.reseller,
                            status: "pending",
                            transferId: transferId,
                        });

                        transferOrderRefund.status = "success";
                        await transferOrderRefund.save();
                    }

                    refundAmount += transferRefundAmount;
                    totalCancellationCharge += cancellationCharge;
                }
            }

            orderCancellation.cancellationStatus = "success";
            orderCancellation.cancellationCharge = totalCancellationCharge;
            orderCancellation.adminId = req.admin?._id;
            await orderCancellation.save();

            await B2COrder.findOneAndUpdate(
                {
                    _id: orderCancellation.orderId,
                },
                {
                    orderStatus: "partially-cancelled",
                },
                { runValidators: true }
            );

            let orderRefund = await B2COrderRefund.create({
                amount: refundAmount,
                note: "Order cancelled by admin",
                orderId: orderCancellation.orderId,
                paymentMethod: "wallet",
                userId: b2cOrder?.user,
                status: "pending",
            });

            orderRefund.status = "success";
            await orderRefund.save();

            await B2BTransaction.create({
                user: b2cOrder.user,
                paymentProcessor: "wallet",
                product: "all",
                processId: b2cOrder?._id,
                description: `Order cancellation refund`,
                debitAmount: 0,
                creditAmount: refundAmount,
                directAmount: 0,
                remark: "Order cancellation refund",
                dateTime: new Date(),
            });

            res.status(200).json({
                message: "order cancelled  successfully submitted.",
                orderId: b2cOrder._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
