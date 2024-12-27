const { Schema, model } = require("mongoose");

const companyBankInfoSchema = new Schema(
    {
        countryCode: {
            type: String,
            required: true,
        },
        bankName: {
            type: String,
            required: true,
        },
        branchAddress: {
            type: String,
        },
        ifscCode: {
            type: String,
        },
        ibanCode: {
            type: String,
        },
        swiftCode: {
            type: String,
            required: true,
        },
        accountNumber: {
            type: String,
            required: true,
        },
        accountHolderName: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const CompanyBankInfo = model("CompanyBankInfo", companyBankInfoSchema);

module.exports = CompanyBankInfo;
