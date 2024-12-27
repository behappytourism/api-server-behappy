const { Schema, model } = require("mongoose");

const licenseTypeSchema = new Schema(
    {
        licenseType: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const LicenseType = model("LicenseType", licenseTypeSchema);

module.exports = LicenseType;
