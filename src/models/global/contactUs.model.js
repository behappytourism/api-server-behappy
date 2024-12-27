const { Schema, model } = require("mongoose");

const contactUsSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const ContactUs = model("ContactUs", contactUsSchema);
module.exports = ContactUs;
