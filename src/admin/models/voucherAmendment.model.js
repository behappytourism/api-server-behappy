const { Schema, model } = require("mongoose");

const voucherAmendmentSchema = new Schema(
    {
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
        noOfInfants: {
            type: Number,
            required: true,
        },
        childrenAges: {
            type: [{ type: Number, required: true }],
            required: true,
        },
        infantAges: {
            type: [{ type: Number, required: true }],
            required: true,
        },
        hotelName: {
            type: String,
        },
        confirmationNumber: {
            type: String,
        },
        referenceNumber: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
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
                    tourName: {
                        type: String,
                        required: true,
                        trim: true,
                    },
                    tourType: {
                        type: String,
                        required: true,
                        lowercase: true,
                        enum: ["regular", "arrival", "departure", "ticket-only", "half-day"],
                    },
                    date: {
                        type: Date,
                        required: true,
                    },
                    pickupFrom: {
                        type: String,
                    },
                    pickupTimeFrom: {
                        type: Number,
                    },
                    pickupTimeTo: {
                        type: Number,
                    },
                    returnTimeFrom: {
                        type: Number,
                    },
                    status: {
                        type: String,
                        required: true,
                        lowercase: true,
                        enum: ["not-booked", "booked"],
                    },
                },
            ],
        },
        termsAndConditions: {
            type: String,
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

const VoucherAmendment = model("VoucherAmendment", voucherAmendmentSchema);

module.exports = VoucherAmendment;
