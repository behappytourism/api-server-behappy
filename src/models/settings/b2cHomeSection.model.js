const { Schema, model } = require("mongoose");

const b2bHomeSectionSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        banners: [
            {
                title: {
                    type: String,
                    required: true,
                },
                description: {
                    type: String,
                    required: true,
                },
                link: {
                    type: String,
                    required: true,
                },
                image: {
                    type: String,
                    required: true,
                },
                isDeleted: {
                    type: Boolean,
                    required: true,
                    default: false,
                },
            },
        ],
    },
    { timestamps: true }
);

const B2CHomeSection = model("B2CHomeSection", b2bHomeSectionSchema);

module.exports = B2CHomeSection;
