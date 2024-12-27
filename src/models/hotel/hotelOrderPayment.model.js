const { Schema, model } = require("mongoose");

const hotelOrderPaymentSchema = new Schema(
    {
        amount: {
            type: Number,
            required: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "HotelOrder",
            required: true,
        },
        paymentState: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "success", "failed"],
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
            enum: ["wallet", "ccavenue"],
        },
        paymentStateMessage: {
            type: String,
        },
    },
    { timestamps: true }
);

const HotelOrderPayment = model("HotelOrderPayment", hotelOrderPaymentSchema);

module.exports = HotelOrderPayment;
