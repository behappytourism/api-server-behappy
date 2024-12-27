const { Schema, model } = require("mongoose");

const b2cOrderRefundSchema = new Schema(
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
            ref: "B2COrder",
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

const B2COrderRefund = model("B2COrderRefund", b2cOrderRefundSchema);

module.exports = B2COrderRefund;
