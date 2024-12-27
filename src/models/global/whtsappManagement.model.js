const { Schema, model } = require("mongoose");

const whatsappManagmentSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        phoneNumber: {
            type: String,
        },
        phoneCode: { type: String },
        status: { type: Boolean, required: true, default: true },
    },
    { timestamps: true }
);

const WhatsappManagement = model("WhatsappManagement", whatsappManagmentSchema);

module.exports = WhatsappManagement;
