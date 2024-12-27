const { Schema, model } = require("mongoose");

const b2bAttractionOrderPaymentSchema = new Schema(
    {
        amount: {
            type: Number,
            required: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "B2BAttractionOrder",
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
            enum: ["wallet", "ccavenue", "tabby"],
        },
        paymentStateMessage: {
            type: String,
        },
    },
    { timestamps: true }
);

const B2BAttractionOrderPayment = model(
    "B2BAttractionOrderPayment",
    b2bAttractionOrderPaymentSchema
);

module.exports = B2BAttractionOrderPayment;
