const { Schema, model } = require("mongoose");

const whatsappCOnfigSchema = new Schema(
    {
        settingsNumber: {
            type: Number,
            required: true,
            default: 1,
            unique: 1,
        },
        name: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
        },
        phoneCode: { type: String },
        qrCode: { type: String },
        status: { type: Boolean, required: true, default: false },
        client: {},
    },
    { timestamps: true }
);

const WhatsappConfig = model("WhatsappConfig", whatsappCOnfigSchema);

module.exports = WhatsappConfig;
