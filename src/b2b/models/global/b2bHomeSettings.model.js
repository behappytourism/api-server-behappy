const { Schema, model } = require("mongoose");

const b2bHomeSettingSchema = new Schema(
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

const B2BBannerSetting = model("B2BBannerSetting", b2bHomeSettingSchema);

module.exports = B2BBannerSetting;
