const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const EmailConfigSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
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
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const EmailConfig = model("EmailConfig", EmailConfigSchema);

module.exports = EmailConfig;
