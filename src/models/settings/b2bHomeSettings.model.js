const { Schema, model } = require("mongoose");

const homeSettingsSchema = new Schema(
    {
        settingsNumber: {
            type: Number,
            required: true,
            default: 1,
            unique: 1,
        },
        logo: {
            type: String,
            required: true,
        },
        phoneNumber1: {
            type: String,
        },
        phoneNumber2: {
            type: String,
        },
        email: {
            type: String,
        },
        facebookUrl: {
            type: String,
        },
        instagramUrl: {
            type: String,
        },
        youtubeUrl: {
            type: String,
        },
        twitterUrl: {
            type: String,
        },
        tripAdvisorUrl: {
            type: String,
        },
        heros: {
            type: [
                {
                    title: {
                        type: String,
                        required: true,
                    },
                    description: {
                        type: String,
                        required: true,
                    },
                    image: {
                        type: String,
                        required: true,
                    },
                    place: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
        cards: {
            type: [
                {
                    title: {
                        type: String,
                        required: true,
                    },
                    description: {
                        type: String,
                        required: true,
                    },
                    backgroundImage: {
                        type: String,
                        required: true,
                    },
                    tag: {
                        type: String,
                    },
                    icon: {
                        type: String,
                    },
                    url: {
                        type: String,
                        required: true,
                    },
                    isRelativeUrl: {
                        type: Boolean,
                        required: true,
                    },
                },
            ],
        },
        isBestSellingAttractionsSectionEnabled: {
            type: Boolean,
            required: true,
            default: true,
        },
        bestSellingAttractions: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Attraction",
                    required: true,
                },
            ],
        },
        isTopAttractionsSectionEnabled: {
            type: Boolean,
            required: true,
            default: true,
        },
        topAttractions: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Attraction",
                    required: true,
                },
            ],
        },
        isBlogsEnabled: {
            type: Boolean,
            required: true,
            default: true,
        },
        footer: {
            type: [
                {
                    title: {
                        type: String,
                        required: true,
                    },
                    navLinks: [
                        {
                            name: {
                                type: String,
                                required: true,
                            },
                            link: {
                                type: String,
                                required: true,
                            },
                            isRelativeUrl: {
                                type: Boolean,
                                required: true,
                            },
                            displayOrder: {
                                type: Number,
                                // required: true,
                            },
                        },
                    ],
                },
            ],
        },
        footerDescription: {
            type: String,
        },
        termsAndConditions: {
            type: String,
            // required: true,
        },
        privacyAndPolicy: {
            type: String,
            // required: true,
        },
        copyRight: {
            type: String,
            // required: true,
        },
        contactUs: {
            type: String,
            // required: true,
        },
        aboutUs: {
            type: String,
            // required: true,
        },
    },
    { timestamps: true }
);

const B2bHomeSettings = model("B2bHomeSettings", homeSettingsSchema);

module.exports = B2bHomeSettings;
