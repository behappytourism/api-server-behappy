const mongoose = require("mongoose");
const slug = require("mongoose-slug-generator");
const { Schema, model } = mongoose;

mongoose.plugin(slug);

const emailUnsubscriberSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    { timestamps: true }
);

const EmailUnsubscriber = model("EmailUnsubscriber", emailUnsubscriberSchema);

module.exports = EmailUnsubscriber;
