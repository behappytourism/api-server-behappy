const { Schema, model } = require("mongoose");

const a2aTicketSchema = new Schema(
    {
        a2aReference: {
            type: Schema.Types.ObjectId,
            ref: "B2BA2a",
            required: true,
        },
        airlineOnward: {
            type: Schema.Types.ObjectId,
            ref: "Airline",
            required: true,
        },
        airlineReturn: {
            type: Schema.Types.ObjectId,
            ref: "Airline",
            required: true,
        },
        airlineOnwardNo: {
            type: String,
            required: true,
        },
        airlineReturnNo: {
            type: String,
            required: true,
        },
        onwardDate: {
            type: Date,
            required: true,
        },
        returnDate: {
            type: Date,
            required: true,
        },
        onwardDurationHr: {
            type: Number,
            required: true,
        },
        onwardDurationMin: {
            type: Number,
            required: true,
        },
        returnDurationHr: {
            type: Number,
            required: true,
        },
        returnDurationMin: {
            type: Number,
            required: true,
        },
        takeOffTimeOnward: {
            type: String,
            required: true,
            // validate: {
            //     validator: (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value),
            //     message: "Invalid landingTimeReturn format (HH:mm)",
            // },
        },
        takeOffTimeReturn: {
            type: String,
            required: true,
            // validate: {
            //     validator: (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value),
            //     message: "Invalid landingTimeReturn format (HH:mm)",
            // },
        },

        landingTimeOnward: {
            type: String,
            required: true,
            // validate: {
            //     validator: (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value),
            //     message: "Invalid landingTimeReturn format (HH:mm)",
            // },
        },
        landingTimeReturn: {
            type: String,
            required: true,
            // validate: {
            //     validator: (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value),
            //     message: "Invalid landingTimeReturn format (HH:mm)",
            // },
        },
        price: {
            type: Number,
            required: true,
        },
        infantPrice: {
            type: Number,
            required: true,
        },
        availableSeats: {
            type: Number,
            required: true,
        },
        totalSeats: {
            type: Number,
            required: true,
        },
        pnrNo: {
            type: String,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        termsAndCond: {
            type: String,
            required: true,
        },
        note: {
            type: String,
        },
        cancellationTime: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const B2BA2aTicket = model("B2BA2aTicket", a2aTicketSchema);

module.exports = B2BA2aTicket;
