const { Schema, model } = require("mongoose");

const b2bOrderRefundSchema = new Schema(
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
            ref: "B2BOrder",
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

const B2BOrderRefund = model("B2BOrderRefund", b2bOrderRefundSchema);

module.exports = B2BOrderRefund;
