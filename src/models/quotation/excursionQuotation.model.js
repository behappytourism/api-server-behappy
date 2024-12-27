const { Schema, model } = require("mongoose");

const excursionQuotationSchema = new Schema(
    {
        excursions: {
            type: [
                {
                    excursionId: {
                        type: Schema.Types.ObjectId,
                        ref: "AttractionActivity",
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
                        lowercase: true,
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
                    vehicleType: {
                        type: [
                            {
                                vehicle: {
                                    type: Schema.Types.ObjectId,
                                    ref: "VehicleType",
                                    // required: true,
                                },
                                vehicleName: {
                                    type: String,
                                    // required: true,
                                },
                                count: {
                                    type: Number,
                                    // required: true,
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
        adultTotal: {
            type: Number,
        },
        childrenTotal: {
            type: Number,
        },
        adultProfileMarkup: {
            type: Number,
        },
        childProfileMarkup: {
            type: Number,
        },
        pvtTransferProfileMarkup: {
            type: Number,
        },
        adultMarketMarkup: {
            type: Number,
        },
        childMarketMarkup: {
            type: Number,
        },
        pvtTransferMarketMarkup: {
            type: Number,
        },
    },
    { timestamps: true }
);

const ExcursionQuotation = model("ExcursionQuotation", excursionQuotationSchema);

module.exports = ExcursionQuotation;
