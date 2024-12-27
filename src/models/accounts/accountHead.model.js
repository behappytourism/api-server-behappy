const { Schema, model } = require("mongoose");

const accountHeadSchema = new Schema(
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

const AccountHead = model("AccountHead", accountHeadSchema);

module.exports = AccountHead;
