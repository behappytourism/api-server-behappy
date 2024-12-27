const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AutoIncrement = require("mongoose-sequence")(mongoose);

const b2cTransactionSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        paymentProcessor: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["paypal", "stripe", "razorpay", "wallet", "ccavenue", "bank", "tabby"],
        },
        product: {
            type: String,
            required: true,
            lowercase: true,
            enum: [
                "airline",
                "hotel",
                "attraction",
                "wallet",
                "a2a",
                "visa",
                "insurance",
                "transfer",
                "all",
            ],
        },
        processId: {
            type: String,
            required: true,
        },
        dateTime: {
            type: Date,
            required: true,
        },
        description: {
            type: String,
        },
        debitAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        creditAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        directAmount: {
            type: Number,
            required: true,
        },
        remark: {
            type: String,
        },
        paymentDetails: {},
        b2cTransactionNo: {
            type: Number,
        },
    },
    { timestamps: true }
);

b2cTransactionSchema.plugin(AutoIncrement, {
    inc_field: "b2cTransactionNo",
    start_seq: 10000,
});

const B2CTransaction = model("B2CTransaction", b2cTransactionSchema);

module.exports = B2CTransaction;
