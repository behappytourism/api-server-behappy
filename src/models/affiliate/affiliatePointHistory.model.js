const { Schema, model } = require("mongoose");

const affiliatePointHistorySchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        points: {
            type: Number,
            required: true,
        },
        previousPoints: {
            type: Number,
            required: true,
        },
        transactionType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["attraction", "withdraw"],
        },
        attractionOrder: {
            type: Schema.Types.ObjectId,
            required: function () {
                return this.transactionType === "attraction";
            },
        },
        withdrawType: {
            type: String,
            required: function () {
                return this.transactionType === "withdraw";
            },
        },
        status: {
            type: String,
            lowercase: true,
            enum: ["pending", "success", "failed"],
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

const AffiliatePointHistory = model("AffiliatePointHistory", affiliatePointHistorySchema);

module.exports = AffiliatePointHistory;
