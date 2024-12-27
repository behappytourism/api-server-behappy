const { Schema, model } = require("mongoose");

const guideQuotationSchema = new Schema(
    {
        guides: {
            type: [
                {
                    guideId: {
                        type: Schema.Types.ObjectId,
                        ref: "Guide",
                        required: true,
                    },
                    name: {
                        type: String,
                        required: true,
                    },
                    duration: {
                        type: String,
                    },
                    count: {
                        type: Number,
                        required: true,
                    },
                    price: {
                        type: Number,
                        required: true,
                    },
                    cost: {
                        type: Number,
                        required: true,
                    },
                },
            ],
            required: true,
        },
        totalCost: {
            type: Number,
        },
        totalPrice: {
            type: Number,
        },
    },
    { timestamps: true }
);

const GuideQuotation = model("GuideQuotation", guideQuotationSchema);

module.exports = GuideQuotation;
