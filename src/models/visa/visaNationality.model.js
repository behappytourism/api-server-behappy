const { Schema, model } = require("mongoose");

const visaNationalitySchema = new Schema(
    {
        nationality: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: true,
        },
        slug: {
            type: String,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        visas: {
            type: [
                {
                    visaType: {
                        type: Schema.Types.ObjectId,
                        ref: "VisaType",
                        required: true,
                    },
                    adultCost: {
                        type: Number,
                        required: true,
                    },
                    childCost: {
                        type: Number,
                        required: true,
                    },
                    adultPrice: {
                        type: Number,
                        required: true,
                    },
                    childPrice: {
                        type: Number,
                        required: true,
                    },

                    isDeleted: {
                        type: Boolean,
                        required: true,
                        default: false,
                    },
                    createdFor: {
                        type: String,
                        required: true,
                        lowercase: true,
                        enum: ["b2b", "b2c", "quotation"],
                    },
                },
            ],
        },
    },
    { timestamps: true }
);

const VisaNationality = model("VisaNationality", visaNationalitySchema);

module.exports = VisaNationality;
