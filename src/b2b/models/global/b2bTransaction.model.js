const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AutoIncrement = require("mongoose-sequence")(mongoose);

const b2bTransactionSchema = new Schema(
    {
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        paymentProcessor: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["wallet", "ccavenue", "tabby"],
        },
        // transactionType: {
        //     type: String,
        //     required: true,
        //     lowercase: true,
        //     enum: ["deposit", "withdraw", "deduct", "refund", "markup"],
        // },
        // amount: {
        //     type: Number,
        //     required: true,
        // },
        // section: {
        //     type: String,
        //     lowercase: true,
        //     enum: ["hotel"],
        // },
        // isPendingExpiry: {
        //     type: Boolean,
        //     required: true,
        //     default: false,
        // },
        // pendingExpiry: {
        //     type: Date,
        //     required: function () {
        //         return this.isPendingExpiry === true;
        //     },
        // },
        // order: {
        //     type: Schema.Types.ObjectId,
        // },
        // orderItem: {
        //     type: Schema.Types.ObjectId,
        //     required: function () {
        //         return this.transactionType === "markup";
        //     },
        // },
        // paymentDetails: {},
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
        },
        creditAmount: {
            type: Number,
            required: true,
        },
        directAmount: {
            type: Number,
            required: true,
        },
        closingBalance: {
            type: Number,
            required: true,
        },
        dueAmount: {
            type: Number,
            required: true,
        },
        remark: {
            type: String,
        },
        b2bTransactionNo: {
            type: Number,
        },
    },
    { timestamps: true }
);

b2bTransactionSchema.plugin(AutoIncrement, {
    inc_field: "b2bTransactionNo",
    start_seq: 10000,
});

const B2BTransaction = model("B2BTransaction", b2bTransactionSchema);

module.exports = B2BTransaction;
