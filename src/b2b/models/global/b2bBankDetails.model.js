const { Schema, model } = require("mongoose");

const b2bBankDetailsSchema = new Schema(
    {
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        isoCode: {
            type: String,
            required: true,
        },
        bankName: {
            type: String,
            required: true,
        },
        accountHolderName: {
            type: String,
            required: true,
        },
        accountNumber: {
            type: String,
            required: true,
        },
        ifscCode: {
            type: String,
        },
        ibanCode: {
            type: String,
        },
        swiftCode: {
            type: String,
        },
        branchName: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const B2BBankDetails = model("B2BBankDetails", b2bBankDetailsSchema);

module.exports = B2BBankDetails;
