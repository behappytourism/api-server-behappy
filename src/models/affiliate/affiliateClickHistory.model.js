const { Schema, model } = require("mongoose");

const affiliateClickHistorySchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        clickType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["attraction", "withdraw"],
        },
        attraction: {
            type: Schema.Types.ObjectId,
            ref: "Attraction",
            required: true,
        },
    },
    { timestamps: true }
);

const AffiliateClickHistory = model("AffiliateClickHistory", affiliateClickHistorySchema);

module.exports = AffiliateClickHistory;
