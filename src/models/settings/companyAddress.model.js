const { Schema, model } = require("mongoose");

const companyAddressSchema = new Schema(
    {
        location: {
            type: String,
            required: true,
        },
        companyName: {
            type: String,
            required: true,
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: true,
        },
        state: {
            type: Schema.Types.ObjectId,
            ref: "State",
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const CompanyAddress = model("CompanyAddress", companyAddressSchema);

module.exports = CompanyAddress;
