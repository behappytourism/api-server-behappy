const { Schema, model } = require("mongoose");

const walletSchema = new Schema(
    {
        balance: {
            type: Number,
            required: true,
            default: 0,
        },
        creditAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        creditUsed: {
            type: Number,
            required: true,
            default: 0,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
    },
    { timestamps: true }
);

const wallet = model("Wallet", walletSchema);

module.exports = wallet;
