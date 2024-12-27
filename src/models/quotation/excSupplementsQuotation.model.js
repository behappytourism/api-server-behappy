const { Schema, model } = require("mongoose");

const excSupplementsQuotationSchema = new Schema({
    excursions: {
        type: [
            {
                excursionId: {
                    type: Schema.Types.ObjectId,
                    ref: "Excursion",
                    required: true,
                },
                excursionName: {
                    type: String,
                    required: true,
                },
                description: {
                    type: String,
                },
                excursionType: {
                    type: String,
                    required: true,
                    lowercase: true,
                    enum: ["ticket", "transfer", "regular"],
                },
                value: {
                    type: String,
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
                pvtTransferPrice: {
                    type: Number,
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
                pvtTransferCost: {
                    type: Number,
                    required: true,
                },
                adultMarketMarkup: {
                    type: Number,
                    required: true,
                },
                childMarketMarkup: {
                    type: Number,
                    required: true,
                },
                pvtTransferMarketMarkup: {
                    type: Number,
                    required: true,
                },
                transferType: {
                    type: String,
                    required: true,
                    enum: ["without", "private", "shared"],
                },
                adultProfileMarkup: {
                    type: Number,
                },
                childProfileMarkup: {
                    type: Number,
                },
                isMarkup: {
                    type: Boolean,
                    default: false,
                },
                markup: {
                    type: Number,
                    required: true,
                    default: 0,
                },
                markupType: { type: String, required: true, default: "flat" },
                vehicleType: {
                    type: [
                        {
                            vehicle: {
                                type: Schema.Types.ObjectId,
                                ref: "VehicleType",
                                required: true,
                            },
                            // vehicleName: {
                            //     type: String,
                            //     required: true,
                            // },
                            count: {
                                type: Number,
                                required: true,
                            },
                            price: {
                                type: Number,
                            },
                        },
                    ],
                },
            },
        ],
        required: true,
    },
});

const ExcSupplementsQuotation = model("ExcSupplementsQuotation", excSupplementsQuotationSchema);

module.exports = ExcSupplementsQuotation;
