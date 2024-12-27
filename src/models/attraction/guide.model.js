const { Schema, model } = require("mongoose");

const guideSchema = new Schema(
    {
        name: {
            type: String,
            lowercase: true,
            trim: true,
            required: true,
        },
        duration: {
            type: Number,
            required: true,
        },
        pricing: {
            type: [
                {
                    fromDate: {
                        type: Date,
                    },
                    toDate: { type: Date },
                    price: {
                        type: Number,
                        // required: true,
                    },
                },
            ],
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const Guide = model("Guide", guideSchema);

module.exports = Guide;
