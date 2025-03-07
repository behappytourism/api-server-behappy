const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AutoIncrement = require("mongoose-sequence")(mongoose);

const b2cWalletWithdrawSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        withdrawAmount: {
            type: Number,
            required: true,
        },
        fee: {
            type: Number,
            required: true,
            default: 0,
        },
        status: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "completed", "failed"],
        },
        withdrawnAdmin: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            required: function () {
                return this.status === "completed";
            },
        },
        paymentProcessor: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["direct", "bank"],
        },
        referenceNo: {
            type: String,
        },
        companyBankId: {
            type: Schema.Types.ObjectId,
            ref: "CompanyBankInfo",
            required: function () {
                return this.paymentProcessor === "bank";
            },
        },
        note: {
            type: String,
        },
        b2bWalletWithdrawRefNo: {
            type: Number,
        },
        bankDetailsId: {
            type: Schema.Types.ObjectId,
            ref: "B2BBankDetails",
            required: function () {
                return this.paymentProcessor === "bank";
            },
        },
        b2bBankDetails: {
            isoCode: {
                type: String,
                required: function () {
                    return this.paymentProcessor === "bank";
                },
            },
            bankName: {
                type: String,
                required: function () {
                    return this.paymentProcessor === "bank";
                },
            },
            branchName: {
                type: String,
                required: function () {
                    return this.paymentProcessor === "bank";
                },
            },
            accountHolderName: {
                type: String,
                required: function () {
                    return this.paymentProcessor === "bank";
                },
            },
            accountNumber: {
                type: String,
                required: function () {
                    return this.paymentProcessor === "bank";
                },
            },
            ifscCode: { type: String },
            ibanCode: { type: String },
        },
    },
    { timestamps: true }
);

b2cWalletWithdrawSchema.plugin(AutoIncrement, {
    inc_field: "b2cWalletWithdrawRefNo",
    start_seq: 10000,
});

const B2cWalletWithdraw = model("B2cWalletWithdraw", b2cWalletWithdrawSchema);

module.exports = B2cWalletWithdraw;
