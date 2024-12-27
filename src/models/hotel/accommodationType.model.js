const { Schema, model } = require("mongoose");

const accommodationTypeSchema = new Schema(
    {
        accommodationTypeName: {
            type: String,
            required: true,
        },
        accommodationTypeCode: {
            type: String,
            required: true,
            uppercase: true,
        },
    },
    { timestamps: true }
);

const AccommodationType = model("AccommodationType", accommodationTypeSchema);

module.exports = AccommodationType;
