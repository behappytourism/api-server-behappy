const { Schema, model } = require("mongoose");

const emailConfigSchema = new Schema(
    {
        product: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["attraction", "a2a", "hotel", "transfer", "cart-order"],
        },
        action: {
            type: [
                {
                    type: String,
                    required: true,
                    lowercase: true,
                    enum: ["approve", "cancel", "confirm", "order"],
                },
            ],
        },
        email: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        host: {
            type: String,
            required: true,
        },
        port: {
            type: Number,
            required: true,
        },
        secure: {
            type: Boolean,
            required: true,
            default: false,
        },
        isActive: {
            type: Boolean,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        type: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["b2b", "b2c"],
            unique: true,
        },
    },
    { timestamps: true }
);

const EmailConfig = model("EmailConfig", emailConfigSchema);

module.exports = EmailConfig;
