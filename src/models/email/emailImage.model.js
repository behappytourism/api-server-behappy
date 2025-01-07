const mongoose = require("mongoose");
const slug = require("mongoose-slug-generator");
const { Schema, model } = mongoose;

mongoose.plugin(slug);

const eamilImageSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        image: {
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

const EmailImage = model("EmailImage", eamilImageSchema);

module.exports = EmailImage;
