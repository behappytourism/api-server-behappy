const { Schema, model } = require("mongoose");

const b2cFrontendSettingsSchema = new Schema(
    {
        termsAndConditions: {
            type: String,
            required: true,
        },
        privacyAndPolicy: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const B2CFrontendSetting = model("B2CFrontendSetting", b2cFrontendSettingsSchema);

module.exports = B2CFrontendSetting;
