const { Schema, model } = require("mongoose")

const b2cTransferOrderPaymentSchema = new Schema(
    {
        amount: {
            type: Number,
            required: true
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'B2CTransferOrder',
            required: true
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
)

const B2CTransferOrderPayment = model("B2CTransferOrderPayment", b2cTransferOrderPaymentSchema)

module.exports = B2CTransferOrderPayment