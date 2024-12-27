const { Schema, model } = require("mongoose");

const b2bHotelOrderRefundSchema = new Schema(
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
            ref: "B2BHotelOrder",
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

const B2BHotelOrderRefund = model("B2BHotelOrderRefund", b2bHotelOrderRefundSchema);

module.exports = B2BHotelOrderRefund;
