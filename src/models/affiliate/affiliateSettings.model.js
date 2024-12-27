const { Schema, model } = require("mongoose");

const affiliateSettingsSchema = new Schema(
    {
        termsAndConditions: {
            type: String,
            required: true,
        },
        policy: {
            type: String,
            required: true,
        },
        pointValue: {
            type: Number,
            required: true,
        },
        deductionFee: {
            type: Number,
            required: true,
        },
        redeemOptions: {
            type: [
                {
                    type: String,
                    enum: ["cashInHand", "cahInBank", "ticket-booking", "crypto"],
                    required: true,
                },
            ],
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const AffiliateSetting = model("AffiliateSetting", affiliateSettingsSchema);

module.exports = AffiliateSetting;
