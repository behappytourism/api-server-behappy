const { Schema, model } = require("mongoose");

const b2bTransferOrderPaymentSchema = new Schema(
    {
        amount: {
            type: Number,
            required: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "B2BTransferOrder",
            required: true,
        },
        paymentState: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "success", "failed"],
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
            enum: ["wallet", "ccavenue"],
        },
        paymentStateMessage: {
            type: String,
        },
    },
    { timestamps: true }
);

const B2BTransferOrderPayment = model("B2BTransferOrderPayment", b2bTransferOrderPaymentSchema);

module.exports = B2BTransferOrderPayment;
