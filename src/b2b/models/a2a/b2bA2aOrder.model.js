const { Schema, model } = require("mongoose");

const a2aOrderSchema = new Schema(
    {
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        noOfTravellers: {
            type: Number,
            required: true,
        },
        orderedBy: {
            type: String,
            required: true,
            enum: ["reseller", "sub-agent"],
        },
        a2aTicket: {
            type: Schema.Types.ObjectId,
            ref: "B2BA2aTicket",
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        passengerDetails: {
            type: [
                {
                    title: {
                        type: String,
                        required: true,
                        enum: ["mr", "ms", "mrs"],
                        lowercase: true,
                    },
                    firstName: {
                        type: String,
                        required: true,
                    },
                    lastName: {
                        type: String,
                        required: true,
                    },
                    code: {
                        type: Number,
                        // required: true,
                    },
                    phoneNumber: {
                        type: Number,
                        required: true,
                    },
                    nationality: {
                        type: Schema.Types.ObjectId,
                        ref: "Country",
                        required: true,
                    },
                    passportNo: {
                        type: String,
                        required: true,
                    },
                    reference: {
                        type: String,
                    },
                    status: {
                        type: String,
                        lowercase: true,
                        enum: ["pending", "booked", "confirmed", "cancelled"],
                    },
                    isCancelled: {
                        type: Boolean,
                        required: true,
                        default: false,
                    },
                    amount: {
                        type: Number,
                        required: true,
                    },
                    profit: { type: Number, default: 0 },
                    ticketNo: {
                        type: String,
                        required: function () {
                            return this.status === "confirmed";
                        },
                    },
                    isInfant: {
                        type: Boolean,
                        required: true,
                        default: false,
                    },
                    isInfant: {
                        type: Boolean,
                        required: true,
                        default: false,
                    },
                    infantDetails: {
                        type: {
                            title: {
                                type: String,
                                required: true,
                                enum: ["miss", "mstr"],
                                lowercase: true,
                            },
                            firstName: {
                                type: String,
                                required: true,
                            },
                            lastName: {
                                type: String,
                                required: true,
                            },
                            passportNo: {
                                type: String,
                                required: true,
                            },
                        },
                        required: function () {
                            return this.isInfant === true;
                        },
                    },
                },
            ],
        },
        amount: {
            type: Number,
            required: true,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        isCancellationAvailable: {
            type: Boolean,
            required: true,
            default: true,
        },
        orderStatus: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "paid", "failed"],
        },
        paymentOrderId: {
            type: String,
        },
        otp: {
            type: Number,
        },
        referenceNumber: {
            type: String,
            required: true,
        },
        markup: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

const B2BA2aOrder = model("B2BA2aOrder", a2aOrderSchema);

module.exports = B2BA2aOrder;
