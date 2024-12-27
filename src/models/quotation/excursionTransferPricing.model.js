const { Schema, model } = require("mongoose");

const excursionTransferPricingSchema = new Schema(
    {
        sicPrice: {
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
        privateTransfer: {
            type: [
                {
                    fromDate: {
                        type: Date,
                    },
                    toDate: { type: Date },
                    vehicleType: {
                        type: [
                            {
                                vehicle: {
                                    type: Schema.Types.ObjectId,
                                    ref: "VehicleType",
                                    // required: true,
                                },
                                price: {
                                    type: Number,
                                    // required: true,
                                },
                            },
                        ],
                    },
                },
            ],
        },
    },
    { timestamps: true }
);

const ExcursionTransferPricing = model("ExcursionTransferPricing", excursionTransferPricingSchema);

module.exports = ExcursionTransferPricing;
