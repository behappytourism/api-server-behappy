const { Schema, model } = require("mongoose");

const hotelOrderRefundSchema = new Schema(
    {
        amount: {
            type: Number,
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "USER",
            required: true,
        },
        paymentMethod: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["wallet", "cc-avenue"],
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "HotelOrder",
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

const HotelOrderRefund = model("HotelOrderRefund", hotelOrderRefundSchema);

module.exports = HotelOrderRefund;
