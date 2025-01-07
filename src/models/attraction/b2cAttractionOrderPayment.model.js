const { Schema, model } = require("mongoose");

const b2cAttractionOrderPaymentSchema = new Schema(
    {
        amount: {
            type: Number,
            required: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "AttractionOrder",
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
            // required: true,
        },
        paymentMethod: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["wallet", "ccavenue", "tabby"],
        },
        paymentStateMessage: {
            type: String,
        },
    },
    { timestamps: true }
);

const B2CAttractionOrderPayment = model(
    "B2CAttractionOrderPayment",
    b2cAttractionOrderPaymentSchema
);

module.exports = B2CAttractionOrderPayment;
