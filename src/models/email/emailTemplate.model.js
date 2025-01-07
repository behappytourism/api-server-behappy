const mongoose = require("mongoose");
const slug = require("mongoose-slug-generator");
const { Schema, model } = mongoose;

mongoose.plugin(slug);

const emailTemplateSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["manual", "custom"],
        },
        html: {
            type: String,
            required: function () {
                return this.type === "custom";
            },
        },
        filePath: {
            type: String,
            required: function () {
                return this.type === "manual";
            },
        },
        tags: {
            type: [],
        },
        isDeleted: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    { timestamps: true }
);

const EmailTemplate = model("EmailTemplate", emailTemplateSchema);

module.exports = EmailTemplate;
