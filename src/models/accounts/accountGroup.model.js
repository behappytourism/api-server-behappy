const { Schema, model } = require("mongoose");

const accountGroupSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        shortCode: {
            type: String,
            // required: true,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    { timestamps: true }
);

const AccountGroup = model("AccountGroup", accountGroupSchema);

module.exports = AccountGroup;
