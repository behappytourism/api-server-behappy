const { Schema, model } = require('mongoose')

const b2cOrderPaymentSchema = new Schema(
    {
        amount: {
            type: Number,
            required: true
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "B2COrder",
            required: true,
        },
        paymentState: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "success", "failed"]
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        paymentMethod: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["ccavenue"]
        },
        paymentStateMessage: {
            type: String
        }
    },
    { timestamps: true }
);

const B2COrderPayment = model("B2COrderPayment", b2cOrderPaymentSchema)

module.exports = B2COrderPayment