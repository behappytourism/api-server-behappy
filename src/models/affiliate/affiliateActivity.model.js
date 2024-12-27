const { Schema, model } = require("mongoose");

const affiliateActivitySchema = new Schema(
    {
        activityId: {
            type: Schema.Types.ObjectId,
            ref: "AttractionActivity",
            required: true,
        },
        adultPoint: {
            type: Number,
            required: true,
        },
        childPoint: {
            type: Number,
            required: true,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    { timestamps: true }
);

const AffiliateActivity = model("AffiliateActivity", affiliateActivitySchema);

module.exports = AffiliateActivity;
