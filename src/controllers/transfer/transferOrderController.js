const { sendErrorResponse } = require("../../helpers");
const { B2CTransferOrder, B2CTransferOrderCancellation } = require("../../models");
const { isValidObjectId, Types } = require("mongoose");

module.exports = {
    cancelB2cTransferOrder: async (req, res) => {
        try {
            const { orderId, transferId } = req.params;
            const { cancellationRemark } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }
            const transferOrder = await B2CTransferOrder.findOne({
                _id: orderId,
                // reseller: req.reseller?._id,
            }).populate("user", "_id email");

            if (!transferOrder) {
                return sendErrorResponse(res, 404, "order details not found");
            }

            const orderDetail = transferOrder.journey.find((joun) => {
                return joun._id.toString() === transferId.toString();
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

            let orderCancellation = await B2CTransferOrderCancellation.findOne({
                orderId,
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
                    return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
                }
            } else {
                orderCancellation = await B2CTransferOrderCancellation.create({
                    cancellationRemark,
                    cancellationStatus: "pending",
                    orderId,
                    userId: transferOrder.user?._id,
                    cancelledBy: "b2c",
                    transferId,
                });
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
