const { Schema, model } = require("mongoose");

const b2bA2aSpecialMarkupSchema = new Schema(
    {
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        atoaId: {
            type: Schema.Types.ObjectId,
            ref: "B2BA2a",
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
    },
    { timestamps: true }
);

const B2BSpecialA2aMarkup = model("B2BSpecialA2aMarkup", b2bA2aSpecialMarkupSchema);

module.exports = B2BSpecialA2aMarkup;
