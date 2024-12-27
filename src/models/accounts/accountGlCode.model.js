const { Schema, model } = require("mongoose");

const accountGlCodeSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        headId: {
            type: Schema.Types.ObjectId,
            ref: "AccountHead",
            required: true,
        },
        natureId: { type: Schema.Types.ObjectId, ref: "AccountNature", required: true },
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

const AccountGlCode = model("AccountGlCode", accountGlCodeSchema);

module.exports = AccountGlCode;
