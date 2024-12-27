const { Schema, model } = require("mongoose");

const ottilaCountrySchema = new Schema(
    {
        ottilaCountryId: {
            type: Number,
            required: true,
        },
        isocode: {
            type: String,
            required: true,
            uppercase: true,
        },
    },
    { timestamps: true }
);

const OttilaCountry = model("OttilaCountry", ottilaCountrySchema);

module.exports = OttilaCountry;
