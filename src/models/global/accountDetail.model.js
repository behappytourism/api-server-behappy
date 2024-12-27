const { Schema, model } = require("mongoose");

const accountDetailsSchema = new Schema(
    {
        accountName: {
            type: String,
            required: true,
        },
        date: {
            type: Date,

            required: true,
        },
        openingBalance: {
            type: Number,
            required: true,
        },
        balance: {
            type: Number,
            required: true,
        },
        accountNumber: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            required: true,
            enum: ["aed", "usd"],
        },
        description: {
            type: String,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const AccountDetail = model("AccountDetail", accountDetailsSchema);

module.exports = AccountDetail;
