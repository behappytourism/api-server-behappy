const { Schema, model } = require("mongoose");

const InsurnacePlanSchema = new Schema(
    {
        insuranceId: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        printName: {
            type: String,
            required: true,
        },
        currency: {
            type: String,
            required: true,
        },
        formulaId: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
        },
        priceId: {
            type: Number,
            required: true,
        },
        priceId: {
            type: Number,
            required: true,
        },
        ruleVersion: {
            type: Number,
            required: true,
        },
        category: {
            type: String,
            required: true,
        },
        code: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        consecutiveDays: {
            type: String,
            required: true,
        },
        SIA: {
            type: String,
            required: true,
        },
        COM: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: false,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
            required: true,
        },
    },
    { timestamps: true }
);

const InsurnacePlan = model("InsurnacePlan", InsurnacePlanSchema);

module.exports = InsurnacePlan;
