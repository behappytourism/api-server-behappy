const { Schema, model } = require("mongoose");

const b2cTransferOrderRefundSchema = new Schema(
    {
        amount: {
            type: Number,
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        paymentMethod: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["wallet"],
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "B2CTransferOrder",
            required: true,
        },
        transferId: {
            type: String,
            required: true,
        },
        note: {
            type: String,
        },
        status: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "success", "failed"],
        },
    },
    { timestamps: true }
);

const B2CTransferOrderRefund = model("B2CTransferOrderRefund", b2cTransferOrderRefundSchema);

module.exports = B2CTransferOrderRefund;
