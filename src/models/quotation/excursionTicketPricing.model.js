const { Schema, model } = require("mongoose");

const excursionTicketPricingSchema = new Schema(
    {
        ticketPrice: {
            type: [
                {
                    fromDate: {
                        type: Date,
                    },
                    toDate: { type: Date },
                    adultPrice: {
                        type: Number,
                        // required: true,
                    },
                    childPrice: {
                        type: Number,
                        // required: true,
                    },
                },
            ],
        },
        sicWithTicket: {
            type: [
                {
                    fromDate: {
                        type: Date,
                    },
                    toDate: { type: Date },
                    adultPrice: {
                        type: Number,
                    },
                    childPrice: {
                        type: Number,
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

const ExcursionTicketPricing = model("ExcursionTicketPricing", excursionTicketPricingSchema);

module.exports = ExcursionTicketPricing;
