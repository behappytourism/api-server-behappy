const { Schema, model } = require("mongoose");

const b2bSubAgentQuotationMarkupSchema = new Schema(
    {
        landmarkMarkupType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["flat", "percentage"],
        },
        landmarkMarkup: {
            type: Number,
            required: true,
        },
        hotelMarkupType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["flat", "percentage"],
        },
        hotelMarkup: {
            type: Number,
            required: true,
        },
        visaMarkupType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["flat", "percentage"],
        },
        visaMarkup: {
            type: Number,
            required: true,
        },
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
    },
    { timestamps: true }
);

const B2BSubAgentQuotationMarkup = model(
    "B2BSubAgentQuotationMarkup",
    b2bSubAgentQuotationMarkupSchema
);

module.exports = B2BSubAgentQuotationMarkup;
