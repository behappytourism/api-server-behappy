const { Schema, model } = require("mongoose");

const seoSettingsSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        seoType: {
            type: String,
            required: true,
            // enum: ["landingPage", "products"],
        },
        seoCategory: [
            {
                name: {
                    type: String,
                    // required: true,
                    // enum: ["attraction", "visa", "home"],
                },
                slug: {
                    type: String,
                    // required: true,
                },
                title: {
                    type: String,
                    // required: true,
                },
                description: {
                    type: String,
                    // required: true,
                },
                image: {
                    type: String,
                },
                keywords: [],
                seoSubCategory: [
                    {
                        name: {
                            type: String,
                            // required: true,
                            // enum: [
                            //     "attraction-products",
                            //     "attraction-destination",
                            //     "visa-nationality",
                            // ],
                        },
                        slug: {
                            type: String,
                            // required: true,
                        },
                        title: {
                            type: String,
                            // required: true,
                        },
                        description: {
                            type: String,
                            // required: true,
                        },
                        image: {
                            type: String,
                        },
                        keywords: [],
                    },
                ],
            },
        ],
    },
    { timestamps: true }
);

const SeoSetting = model("SeoSetting", seoSettingsSchema);

module.exports = SeoSetting;
