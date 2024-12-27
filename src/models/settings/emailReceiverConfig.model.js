const { Schema, model } = require("mongoose");

const emailConfigSchema = new Schema(
    {
        product: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["attraction", "a2a", "hotel", "transfer", "orders"],
        },
        action: {
            type: [
                {
                    type: String,
                    required: true,
                    lowercase: true,
                    enum: ["approve", "cancel", "confirm"],
                },
            ],
        },
        email: {
            type: String,
            required: true,
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

const EmailReceiverConfig = model("EmailReceiverConfig", emailConfigSchema);

module.exports = EmailReceiverConfig;
