const { Schema, model } = require("mongoose");

const voucherSettingsSchema = new Schema(
    {
        termsAndCondition: {
            type: String,
            required: true,
        },
        settingsNumber: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

const VoucherSettings = model("VoucherSettings", voucherSettingsSchema);

module.exports = VoucherSettings;
