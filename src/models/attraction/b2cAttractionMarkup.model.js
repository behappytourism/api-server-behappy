const { Schema, model } = require("mongoose");

const b2cAttractionMarkupSchema = new Schema(
    {
        adultMarkupType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["flat", "percentage"],
        },
        adultMarkup: {
            type: Number,
            required: true,
        },
        childMarkupType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["flat", "percentage"],
        },
        childMarkup: {
            type: Number,
            required: true,
        },
        infantMarkup: {
            type: Number,
            required: true,
        },
        infantMarkupType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["flat", "percentage"],
        },
        activityId: {
            type: Schema.Types.ObjectId,
            ref: "Attraction",
            required: true,
        },
    },
    { timestamps: true }
);

const B2CAttractionMarkup = model("B2CAttractionMarkup", b2cAttractionMarkupSchema);

module.exports = B2CAttractionMarkup;
