const { Schema, model } = require("mongoose");

const b2bSubAgentStarCategoryMarkupSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        markup: {
            type: Number,
            required: true,
            default: 0,
        },
        markupType: {
            type: String,
            required: true,
            enum: ["flat", "percentage"],
        },
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
    },
    { timestamps: true }
);

const B2BClientStarCategoryMarkup = model(
    "B2BClientStarCategoryMarkup",
    b2bSubAgentStarCategoryMarkupSchema
);

module.exports = B2BClientStarCategoryMarkup;
