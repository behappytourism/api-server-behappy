const { isValidObjectId } = require("mongoose");

const { VehicleType, VehicleCategory } = require("../../../models/transfer");
const { vehicleTypeSchema } = require("../../validations/transfer/vehicleType.schema");
const { sendErrorResponse } = require("../../../helpers");
const {
    B2BTransferOrder,
    B2BTransferOrderCancellation,
    B2BTransferOrderRefund,
    B2BWallet,
    B2BTransaction,
} = require("../../../b2b/models");
const {
    B2CTransferOrder,
    B2CTransferOrderCancellation,
    B2CTransferOrderRefund,
    B2CTransaction,
} = require("../../../models");
const { addMoneyToB2bWallet } = require("../../../b2b/utils/wallet");

module.exports = {
    getAllTransferOrders: async (req, res) => {
        try {
            const { skip = 0, limit = 10, search, dateFrom, dateTo, section } = req.query;

            let filter = {};
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

            let transferOrders;
            let totalTransfers;
            if (section === "b2b") {
                transferOrders = await B2BTransferOrder.find(filter)
                    .populate("reseller country")
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .skip(limit * skip)
                    .lean();

                totalTransfers = await B2BTransferOrder.find(filter).count();
            } else {
                transferOrders = await B2CTransferOrder.find(filter)
                    .populate("user country")
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .skip(limit * skip)
                    .lean();

                totalTransfers = await B2CTransferOrder.find(filter).count();
            }

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

    singleTransferB2bCancellation: async (req, res) => {
        try {
            const { orderId, transferId } = req.params;
            const { cancellationCharge, cancellationRemark } = req.body;
            console.log(orderId, transferId, "orderId, transferId ");

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const transferOrder = await B2BTransferOrder.findOne({
                _id: orderId,
            }).populate("reseller", "name email");

            if (!transferOrder) {
                return sendErrorResponse(res, 404, "transfer order not found");
            }

            const transOrder = transferOrder.journey.find((journ) => {
                return journ._id.toString() === transferId.toString() && journ;
            });

            if (!transOrder) {
                return sendErrorResponse(res, 404, "journey  not found");
            }

            if (transOrder.status === "cancelled") {
                return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
            }
            if (transOrder.status !== "booked" && transOrder.status !== "confirmed") {
                return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            }

            if (Number(cancellationCharge) > transOrder.netPrice) {
                return sendErrorResponse(res, 400, "cancellation charge is greater than net price");
            }

            let prevOrderCancellation = await B2BTransferOrderCancellation.findOne({
                orderId,
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
                orderId,
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
                    _id: orderId,
                    "journey._id": transferId,
                },
                {
                    "journey.$.status": "cancelled",
                    "journey.$.note": cancellationRemark,
                },
                { runValidators: true }
            );
            refundAmount = transOrder.netPrice - Number(cancellationCharge);

            let transferOrderRefund;
            if (refundAmount > 0) {
                transferOrderRefund = await B2BTransferOrderRefund.create({
                    amount: refundAmount,
                    note: "Transfer order cancelled by admin",
                    orderId,
                    paymentMethod: "wallet",
                    resellerId: transferOrder?.reseller,
                    status: "pending",
                    transferId: transferId,
                });

                let wallet = await B2BWallet.findOne({
                    reseller: transferOrder.reseller,
                });
                if (!wallet) {
                    wallet = new B2BWallet({
                        balance: refundAmount,
                        reseller: transferOrder.reseller,
                    });
                    await wallet.save();
                } else {
                    await addMoneyToB2bWallet(wallet, refundAmount);
                }

                transferOrderRefund.status = "success";
                await transferOrderRefund.save();
                await B2BTransaction.create({
                    reseller: transferOrder.reseller,
                    paymentProcessor: "wallet",
                    product: "transfer",
                    processId: transferOrder?._id,
                    description: `Transfer cancellation refund`,
                    debitAmount: 0,
                    creditAmount: refundAmount,
                    directAmount: 0,
                    closingBalance: wallet.balance,
                    dueAmount: wallet.creditUsed,
                    remark: "Transfer cancellation refund",
                    dateTime: new Date(),
                });
            }

            res.status(200).json({
                message: "order cancellation  successfully submitted.",
                cancellation: orderCancellation,
                refund: transferOrderRefund,
                transferId: orderCancellation.transferId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    approveTransferOrderB2bCancellationRequest: async (req, res) => {
        try {
            const { cancellationId } = req.params;
            const { cancellationCharge } = req.body;

            if (!isValidObjectId(cancellationId)) {
                return sendErrorResponse(res, 400, "invalid cancellation id");
            }

            let orderCancellation = await B2BTransferOrderCancellation.findById(cancellationId);
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
            const transferOrder = await B2BTransferOrder.findOne({
                _id: orderCancellation.orderId,
                reseller: orderCancellation.resellerId,
            }).populate("reseller", "name email");

            if (!transferOrder) {
                return sendErrorResponse(res, 404, "transfer order not found");
            }

            const transOrder = transferOrder.journey.find((joun) => {
                return joun._id.toString() === orderCancellation.transferId.toString() && joun;
            });

            if (!transOrder) {
                return sendErrorResponse(res, 404, "transfer  not found");
            }

            if (transOrder.status === "cancelled") {
                return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
            }
            // if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
            //     return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            // }

            if (Number(cancellationCharge) > transOrder?.netPrice) {
                return sendErrorResponse(res, 400, "cancellation charge is greater than net price");
            }

            orderCancellation.cancellationStatus = "success";
            orderCancellation.cancellationCharge = cancellationCharge;
            orderCancellation.adminId = req.admin?._id;
            await orderCancellation.save();
            await B2BTransferOrder.findOneAndUpdate(
                {
                    _id: orderCancellation.orderId,
                    "journey._id": orderCancellation?.transferId,
                },
                {
                    "journey.$.status": "cancelled",
                    "journey.$.note": orderCancellation?.cancellationRemark,
                },
                { runValidators: true }
            );
            refundAmount = Number(transOrder.netPrice) - Number(cancellationCharge);

            console.log(refundAmount, "refundAmount");
            let transferOrderRefund;
            if (refundAmount > 0) {
                transferOrderRefund = await B2BTransferOrderRefund.create({
                    amount: refundAmount,
                    note: "Transfer order cancelled by admin",
                    orderId: orderCancellation.orderId,
                    paymentMethod: "wallet",
                    resellerId: transferOrder?.reseller,
                    status: "pending",
                    transferId: orderCancellation?.transferId,
                });

                let wallet = await B2BWallet.findOne({
                    reseller: transferOrder.reseller,
                });
                if (!wallet) {
                    wallet = new B2BWallet({
                        balance: refundAmount,
                        reseller: transferOrder.reseller,
                    });
                    await wallet.save();
                } else {
                    await addMoneyToB2bWallet(wallet, refundAmount);
                }

                transferOrderRefund.status = "success";
                await transferOrderRefund.save();
                await B2BTransaction.create({
                    reseller: transferOrder.reseller,
                    paymentProcessor: "wallet",
                    product: "transfer",
                    processId: transferOrder?._id,
                    description: `Transfer cancellation refund`,
                    debitAmount: 0,
                    creditAmount: refundAmount,
                    directAmount: 0,
                    closingBalance: wallet.balance,
                    dueAmount: wallet.creditUsed,
                    remark: "Transfer cancellation refund",
                    dateTime: new Date(),
                });
            } else {
                return sendErrorResponse(
                    res,
                    400,
                    "Sorry, You can't cancel this order refund amount is less"
                );
            }
            res.status(200).json({
                message: "order cancellation  successfully submitted.",
                cancellation: orderCancellation,
                refund: transferOrderRefund,
                transferId: orderCancellation.transferId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    singleTransferB2cCancellation: async (req, res) => {
        try {
            const { orderId, transferId } = req.params;
            const { cancellationCharge, cancellationRemark } = req.body;
            console.log(orderId, transferId, "orderId, transferId ");

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const transferOrder = await B2CTransferOrder.findOne({
                _id: orderId,
            }).populate("user", "_id email");

            if (!transferOrder) {
                return sendErrorResponse(res, 404, "transfer order not found");
            }

            const transOrder = transferOrder.journey.find((journ) => {
                return journ._id.toString() === transferId.toString() && journ;
            });

            if (!transOrder) {
                return sendErrorResponse(res, 404, "journey  not found");
            }

            if (transOrder.status === "cancelled") {
                return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
            }
            if (transOrder.status !== "booked" && transOrder.status !== "confirmed") {
                return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            }

            if (Number(cancellationCharge) > transOrder.netPrice) {
                return sendErrorResponse(res, 400, "cancellation charge is greater than net price");
            }

            let prevOrderCancellation = await B2CTransferOrderCancellation.findOne({
                orderId,
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

            let orderCancellation = await B2CTransferOrderCancellation.create({
                cancellationRemark,
                cancellationStatus: "pending",
                orderId,
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
            await B2CTransferOrder.findOneAndUpdate(
                {
                    _id: orderId,
                    "journey._id": transferId,
                },
                {
                    "journey.$.status": "cancelled",
                    "journey.$.note": cancellationRemark,
                },
                { runValidators: true }
            );
            refundAmount = transOrder.netPrice - Number(cancellationCharge);

            let transferOrderRefund;
            if (refundAmount > 0) {
                transferOrderRefund = await B2CTransferOrderRefund.create({
                    amount: refundAmount,
                    note: "Transfer order cancelled by admin",
                    orderId,
                    paymentMethod: "wallet",
                    userId: transferOrder?.user,
                    status: "pending",
                    transferId: transferId,
                });

                transferOrderRefund.status = "success";
                await transferOrderRefund.save();
                await B2CTransaction.create({
                    user: transferOrder.user,
                    paymentProcessor: "wallet",
                    product: "transfer",
                    processId: transferOrder?._id,
                    description: `Transfer cancellation refund`,
                    debitAmount: 0,
                    creditAmount: refundAmount,
                    directAmount: 0,
                    remark: "Transfer cancellation refund",
                    dateTime: new Date(),
                });
            }

            res.status(200).json({
                message: "order cancellation  successfully submitted.",
                cancellation: orderCancellation,
                refund: transferOrderRefund,
                transferId: orderCancellation.transferId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    approveTransferOrderB2cCancellationRequest: async (req, res) => {
        try {
            const { cancellationId } = req.params;
            const { cancellationCharge } = req.body;

            if (!isValidObjectId(cancellationId)) {
                return sendErrorResponse(res, 400, "invalid cancellation id");
            }

            let orderCancellation = await B2BTransferOrderCancellation.findById(cancellationId);
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
            const transferOrder = await B2BTransferOrder.findOne({
                _id: orderCancellation.orderId,
                reseller: orderCancellation.resellerId,
            }).populate("reseller", "name email");

            if (!transferOrder) {
                return sendErrorResponse(res, 404, "transfer order not found");
            }

            const transOrder = transferOrder.journey.find((joun) => {
                return joun._id.toString() === orderCancellation.transferId.toString() && joun;
            });

            if (!transOrder) {
                return sendErrorResponse(res, 404, "transfer  not found");
            }

            if (transOrder.status === "cancelled") {
                return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
            }
            // if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
            //     return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            // }

            if (Number(cancellationCharge) > transOrder?.netPrice) {
                return sendErrorResponse(res, 400, "cancellation charge is greater than net price");
            }

            orderCancellation.cancellationStatus = "success";
            orderCancellation.cancellationCharge = cancellationCharge;
            orderCancellation.adminId = req.admin?._id;
            await orderCancellation.save();
            await B2BTransferOrder.findOneAndUpdate(
                {
                    _id: orderCancellation.orderId,
                    "journey._id": orderCancellation?.transferId,
                },
                {
                    "journey.$.status": "cancelled",
                    "journey.$.note": orderCancellation?.cancellationRemark,
                },
                { runValidators: true }
            );
            refundAmount = Number(transOrder.netPrice) - Number(cancellationCharge);

            console.log(refundAmount, "refundAmount");
            let transferOrderRefund;
            if (refundAmount > 0) {
                transferOrderRefund = await B2BTransferOrderRefund.create({
                    amount: refundAmount,
                    note: "Transfer order cancelled by admin",
                    orderId: orderCancellation.orderId,
                    paymentMethod: "wallet",
                    resellerId: transferOrder?.reseller,
                    status: "pending",
                    transferId: orderCancellation?.transferId,
                });

                let wallet = await B2BWallet.findOne({
                    reseller: transferOrder.reseller,
                });
                if (!wallet) {
                    wallet = new B2BWallet({
                        balance: refundAmount,
                        reseller: transferOrder.reseller,
                    });
                    await wallet.save();
                } else {
                    await addMoneyToB2bWallet(wallet, refundAmount);
                }

                transferOrderRefund.status = "success";
                await transferOrderRefund.save();
                await B2BTransaction.create({
                    reseller: transferOrder.reseller,
                    paymentProcessor: "wallet",
                    product: "transfer",
                    processId: transferOrder?._id,
                    description: `Transfer cancellation refund`,
                    debitAmount: 0,
                    creditAmount: refundAmount,
                    directAmount: 0,
                    closingBalance: wallet.balance,
                    dueAmount: wallet.creditUsed,
                    remark: "Transfer cancellation refund",
                    dateTime: new Date(),
                });
            } else {
                return sendErrorResponse(
                    res,
                    400,
                    "Sorry, You can't cancel this order refund amount is less"
                );
            }
            res.status(200).json({
                message: "order cancellation  successfully submitted.",
                cancellation: orderCancellation,
                refund: transferOrderRefund,
                transferId: orderCancellation.transferId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
