const { Schema, model } = require("mongoose");

const b2bWalletDepositRequestSchema = new Schema(
    {
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        companyBankId: {
            type: Schema.Types.ObjectId,
            ref: "CompanyBankInfo",
            required: true,
        },
        referenceNumber: {
            type: String,
            required: true,
        },
        receipt: {
            type: String,
        },
        status: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "confirmed", "cancelled"],
        },
        remark: {
            type: String,
        },
        confirmedBy: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            required: function () {
                return this.status === "confirmed";
            },
        },
    },
    { timestamps: true }
);

const B2bWalletDepositRequest = model("B2bWalletDepositRequest", b2bWalletDepositRequestSchema);

module.exports = B2bWalletDepositRequest;
