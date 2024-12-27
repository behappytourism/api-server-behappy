const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AutoIncrement = require("mongoose-sequence")(mongoose);

const companyTransactionSchema = new Schema(
    {
        account: {
            type: Schema.Types.ObjectId,
            ref: "AccountDetail",
            required: true,
        },
        transactionType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["income", "expense"],
        },
        status: {
            type: String,
            lowercase: true,
            enum: ["pending", "success", "failed"],
            required: true,
        },
        paymentProcessor: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["cash-in-hand", "bank"],
        },
        paymentId: {
            type: String,
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: "TransactionCategory",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        paymentDetails: {},
        transactionNumber: {
            type: Number,
        },
        note: {
            type: String,
        },
    },
    { timestamps: true }
);

companyTransactionSchema.plugin(AutoIncrement, {
    inc_field: "transactionNumber",
    start_seq: 10000,
});

const CompanyTransaction = model("CompanyTransaction", companyTransactionSchema);

module.exports = CompanyTransaction;
