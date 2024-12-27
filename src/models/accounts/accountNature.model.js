const { Schema, model } = require("mongoose");

const accountNatureSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        shortCode: {
            type: String,
            required: true,
            unique: true,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    { timestamps: true }
);

const AccountNature = model("AccountNature", accountNatureSchema);

module.exports = AccountNature;
