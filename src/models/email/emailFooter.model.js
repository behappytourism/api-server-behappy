const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const EmailFooterSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        html: {
            type: String,
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

const EmailFooter = model("EmailFooter", EmailFooterSchema);

module.exports = EmailFooter;
