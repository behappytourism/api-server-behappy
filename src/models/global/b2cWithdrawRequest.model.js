const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AutoIncrement = require("mongoose-sequence")(mongoose);

const b2cWalletWithdrawRequestSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        bankDetailsId: {
            type: Schema.Types.ObjectId,
            ref: "B2BBankDetails",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            required: true,
            enum: ["initiated", "pending", "confirmed", "cancelled"],
        },
        otp: {
            type: Number,
            required: true,
        },
        remark: {
            type: String,
        },
        cancellationReason: {
            type: String,
            required: function () {
                return this.status === "cancelled";
            },
        },
        b2bWalletWithdrawRequestRefNo: {
            type: Number,
        },
        b2bBankDetails: {
            isoCode: { type: String, required: true },
            bankName: { type: String, required: true },
            branchName: { type: String, required: true },
            accountHolderName: { type: String, required: true },
            accountNumber: { type: String, required: true },
            ifscCode: { type: String },
            ibanCode: { type: String },
        },
        withdrawalId: {
            type: Schema.Types.ObjectId,
            ref: "B2bWalletWithdraw",
            required: function () {
                return this.status === "confirmed";
            },
        },
    },
    { timestamps: true }
);

b2cWalletWithdrawRequestSchema.plugin(AutoIncrement, {
    inc_field: "b2cWalletWithdrawRequestRefNo",
    start_seq: 10000,
});

const B2CWalletWithdrawRequest = model("B2CWalletWithdrawRequest", b2cWalletWithdrawRequestSchema);

module.exports = B2CWalletWithdrawRequest;
