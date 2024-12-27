const mongoose = require("mongoose");
const { Schema, model } = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const affiliateRedeemSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        currency: {
            type: String,
            required: true,
        },
        points: {
            type: Number,
            required: true,
        },
        financialData: {
            type: Schema.Types.ObjectId,
            ref: "FinancialUserData",
            required: true,
        },
        feeDeduction: {
            type: Number,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        status: {
            type: String,
            enum: ["initiated", "pending", "approved", "cancelled"],
            required: true,
        },
        transactionNo: {
            type: Number,
        },
        reason: {
            type: String,
            required: function () {
                return this.status === "approved" || this.status === "cancelled";
            },
        },
    },
    { timestamps: true }
);

affiliateRedeemSchema.plugin(AutoIncrement, {
    inc_field: "transactionNo",
    start_seq: 10000,
});

const AffiliateRedeem = model("AffiliateRedeem", affiliateRedeemSchema);

module.exports = AffiliateRedeem;
