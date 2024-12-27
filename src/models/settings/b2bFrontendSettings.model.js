const { Schema, model } = require("mongoose");

const b2bFrontendSettingsSchema = new Schema(
    {
        termsAndConditions: {
            type: String,
            // required: true,
        },
        privacyAndPolicy: {
            type: String,
            // required: true,
        },
    },
    { timestamps: true }
);

const B2BFrontendSetting = model("B2BFrontendSetting", b2bFrontendSettingsSchema);

module.exports = B2BFrontendSetting;
