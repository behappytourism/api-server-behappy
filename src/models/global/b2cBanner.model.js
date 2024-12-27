const { Schema, model } = require("mongoose");

const bannerSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            enum: ["a2a", "visa", "hotel", "flight", "quotation", "attraction", "transfer", "home"],
        },
        banners: {
            type: [
                {
                    title: {
                        type: String,
                        // required: true,
                    },
                    body: {
                        type: String,
                        // required: true,
                    },
                    image: {
                        type: String,
                        required: true,
                    },
                    isButton: {
                        type: Boolean,
                        default: false,
                        required: true,
                    },
                    buttonText: {
                        type: String,
                        required: function () {
                            return this.isButton === true;
                        },
                    },
                    buttonUrl: {
                        type: String,
                        required: function () {
                            return this.isButton === true;
                        },
                    },
                    isDeleted: {
                        type: Boolean,
                        default: false,
                        required: true,
                    },
                },
            ],
        },
    },
    { timestamps: true }
);

const B2CBanner = model("B2CBanner", bannerSchema);

module.exports = B2CBanner;
