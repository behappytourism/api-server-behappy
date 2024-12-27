const { Schema, model } = require("mongoose");

const invoiceSettingsSchema = new Schema(
    {
        companyLogo: {
            type: String,
            required: true,
        },
        companyName: {
            type: String,
            required: true,
        },
        emails: {
            type: [
                {
                    type: String,
                    required: true,
                    lowercase: true,
                },
            ],
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        showTermsAndConditions: {
            type: Boolean,
            required: true,
        },
        termsAndConditions: {
            type: String,
        },
        showBankDetails: {
            type: Boolean,
            required: true,
        },
        bankAccounts: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "CompanyBankInfo",
                    required: true,
                },
            ],
            required: true,
        },
        settingsNumber: {
            type: Number,
            required: true,
            unique: true,
        },
    },
    { timestamps: true }
);

const InvoiceSettings = model("InvoiceSettings", invoiceSettingsSchema);

module.exports = InvoiceSettings;
