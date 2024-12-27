const { Schema, model } = require("mongoose");

const voucherAmendmentV2Schema = new Schema(
    {
        referenceNumber: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        passengerName: {
            type: String,
            required: true,
        },
        noOfAdults: {
            type: Number,
            required: true,
        },
        noOfChildren: {
            type: Number,
            required: true,
        },
        childrenAges: {
            type: [{ type: Number, required: true }],
            required: true,
        },
        hotels: {
            type: [
                {
                    hotelId: {
                        type: Schema.Types.ObjectId,
                        ref: "Hotel",
                        required: true,
                    },
                    hotelName: {
                        type: String,
                        required: true,
                    },
                    confirmationNumber: {
                        type: String,
                    },
                    checkInDate: {
                        type: Date,
                        required: true,
                    },
                    checkInNote: {
                        type: String,
                    },
                    checkOutDate: {
                        type: Date,
                        required: true,
                    },
                    checkOutNote: {
                        type: String,
                    },
                    roomDetails: {
                        type: String,
                    },
                    noOfRooms: {
                        type: String,
                    },
                },
            ],
        },
        buffetBreakfast: {
            type: String,
        },
        basisOfTransfer: {
            type: String,
            required: true,
        },
        arrivalAirportId: {
            type: Schema.Types.ObjectId,
            ref: "Airport",
        },
        arrivalAirportName: {
            type: String,
        },
        pagingName: {
            type: String,
            required: true,
        },
        contactName: {
            type: String,
            required: true,
        },
        contactNumber: {
            type: String,
            required: true,
        },
        printNote: {
            type: String,
            required: true,
        },
        arrivalDate: {
            type: Date,
        },
        arrivalNote: {
            type: String,
        },
        departureDate: {
            type: Date,
        },
        departureNote: {
            type: String,
        },
        tours: {
            type: [
                {
                    date: {
                        type: Date,
                        required: true,
                    },
                    tourItems: {
                        type: [
                            {
                                tourName: {
                                    type: String,
                                    required: true,
                                    trim: true,
                                },
                                tourType: {
                                    type: String,
                                    required: true,
                                    lowercase: true,
                                    enum: [
                                        "regular",
                                        "arrival",
                                        "departure",
                                        "ticket-only",
                                        "half-day",
                                    ],
                                },
                                utcOffset: {
                                    type: Number,
                                    required: true,
                                },
                                date: {
                                    type: Date,
                                    required: true,
                                },
                                pickupFrom: {
                                    type: String,
                                },
                                pickupISODateTime: {
                                    type: Date,
                                },
                                pickupISOToDateTime: {
                                    type: Date,
                                },
                                returnISODateTime: {
                                    type: Date,
                                },
                                qtnTransfers: [
                                    {
                                        vehicleType: {
                                            type: Schema.Types.ObjectId,
                                            ref: "VehicleType",
                                            required: true,
                                        },
                                        count: {
                                            type: Number,
                                            required: true,
                                        },
                                    },
                                ],
                                status: {
                                    type: String,
                                    required: true,
                                    lowercase: true,
                                    enum: ["not-booked", "booked"],
                                },
                            },
                        ],
                        required: true,
                    },
                },
            ],
        },
        termsAndConditions: {
            type: String,
            required: true,
        },
        quotation: {
            type: Schema.Types.ObjectId,
            ref: "Quotation",
        },
        quotationAmendment: {
            type: Schema.Types.ObjectId,
            ref: "QuotationAmendment",
        },
        voucherId: {
            type: Number,
            required: true,
        },
        isCancelled: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const VoucherAmendmentV2 = model("VoucherAmendmentV2", voucherAmendmentV2Schema);

module.exports = VoucherAmendmentV2;
