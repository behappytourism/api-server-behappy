const { Schema, model } = require("mongoose");

const contractProviderSchema = new Schema(
    {
        providerName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const ContractProvider = model("ContractProvider", contractProviderSchema);

module.exports = ContractProvider;
