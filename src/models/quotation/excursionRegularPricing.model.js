const { Schema, model } = require("mongoose");

const excursionRegularPricingSchema = new Schema(
    {
        price: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

const ExcursionRegularPricing = model(
    "ExcursionRegularPricing",
    excursionRegularPricingSchema
);

module.exports = ExcursionRegularPricing;
