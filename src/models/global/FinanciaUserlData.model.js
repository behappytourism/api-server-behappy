const mongoose = require("mongoose");
const { Schema, model } = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const financialUserDataSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            lowercase: true,
            enum: ["bank", "crypto"],
            required: true,
        },
        bankName: {
            type: String,
            required: function () {
                return this.type === "bank";
            },
        },
        accountHolderName: {
            type: String,
            required: function () {
                return this.type === "bank";
            },
        },
        countryCode: {
            type: String,
            required: function () {
                return this.type === "bank";
            },
        },
        accountNumber: {
            type: String,
            required: function () {
                return this.type === "bank";
            },
        },
        ifsc: {
            type: String,
        },
        iban: {
            type: String,
        },
        network: {
            type: String,
            enum: ["bep20-bsc", "eth", "tron"],
            required: function () {
                return this.type === "crypto";
            },
        },
        address: {
            type: String,
            required: function () {
                return this.type === "crypto";
            },
        },
    },
    { timestamps: true }
);

const FinancialUserData = model("FinancialUserData", financialUserDataSchema);

module.exports = FinancialUserData;
