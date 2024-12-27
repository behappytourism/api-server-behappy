const { Schema, model } = require("mongoose");

const b2bTransferOrderRefundSchema = new Schema(
    {
        amount: {
            type: Number,
            required: true,
        },
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
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
            ref: "B2BAttractionOrder",
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

const B2BTransferOrderRefund = model("B2BTransferOrderRefund", b2bTransferOrderRefundSchema);

module.exports = B2BTransferOrderRefund;
