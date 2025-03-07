const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AutoIncrement = require("mongoose-sequence")(mongoose);

const b2cWalletDepositSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        depositAmount: {
            type: Number,
            required: true,
        },
        creditAmount: {
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
        isDepositedByAdmin: {
            type: Boolean,
            required: true,
        },
        adminDepositor: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            required: function () {
                return this.isDepositedByAdmin === true;
            },
        },
        paymentProcessor: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["ccavenue", "bank", "cash-in-hand"],
        },
        companyBankId: {
            type: Schema.Types.ObjectId,
            ref: "CompanyBankInfo",
            required: function () {
                return this.paymentProcessor === "bank";
            },
        },
        referenceNo: {
            type: String,
            required: function () {
                return this.paymentProcessor === "bank";
            },
        },
        note: {
            type: String,
        },
        b2bWalletDepositRefNumber: {
            type: Number,
        },
    },
    { timestamps: true }
);

b2cWalletDepositSchema.plugin(AutoIncrement, {
    inc_field: "b2cWalletDepositRefNumber",
    start_seq: 10000,
});

const B2CWalletDeposit = model("B2CWalletDeposit", b2cWalletDepositSchema);

module.exports = B2CWalletDeposit;
