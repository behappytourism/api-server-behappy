const { Schema, model } = require("mongoose");

const b2bFlightOrderSchema = new Schema(
    {
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        referenceNumber: {
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
        totalPassengers: {
            type: Number,
            required: true,
        },
        passengers: {
            type: [
                {
                    paxId: { type: String, required: true },
                    passengerType: {
                        type: String,
                        required: true,
                        uppercase: true,
                        enum: ["ADT", "CHD", "INF"],
                    },
                    firstName: { type: String, required: true },
                    lastName: { type: String, required: true },
                    gender: {
                        type: String,
                        required: true,
                        uppercase: true,
                        enum: ["FEMALE", "MALE"],
                    },
                    nationality: { type: String, required: true },
                    birthDate: { type: Date, required: true },
                    passportNumber: { type: String },
                    passportExpiry: { type: Date },
                },
            ],
            required: true,
        },
        contactDetails: {
            phoneCode: { type: String, required: true },
            phoneNumber: { type: String, required: true },
            email: { type: String, required: true },
        },
        ancillaries: {
            type: [
                {
                    journeyOriginDestinationInfo: {
                        from: { type: String, required: true },
                        to: { type: String, required: true },
                    },
                    userSelectedBaggageAncillaries: [
                        {
                            journeyKey: { type: String, required: true },
                            baggageDetails: {
                                type: [
                                    {
                                        baggageCode: {
                                            type: String,
                                            required: true,
                                        },
                                        baggageInfo: {
                                            type: String,
                                            required: true,
                                        },
                                        paxId: {
                                            type: String,
                                            required: true,
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                    userSelectedMealAncillaries: [
                        {
                            segmentKey: { type: String, required: true },
                            mealDetails: {
                                type: [
                                    {
                                        mealCode: {
                                            type: String,
                                            required: true,
                                        },
                                        mealInfo: {
                                            type: String,
                                            required: true,
                                        },
                                        paxId: {
                                            type: String,
                                            required: true,
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                    userSelectedSeatAncillaries: [
                        {
                            segmentKey: { type: String, required: true },
                            seatDetails: [
                                {
                                    seatCode: {
                                        type: String,
                                        required: true,
                                    },
                                    seatNumber: {
                                        type: String,
                                        required: true,
                                    },
                                    paxId: {
                                        type: String,
                                        required: true,
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
            required: true,
        },
        tripType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["oneway", "return"],
        },
        trips: {
            type: [{}],
            required: true,
        },
        netFare: {
            type: Number,
            required: true,
        },
        baseFare: {
            type: Number,
            required: true,
        },
        totalTax: {
            type: Number,
            required: true,
        },
        totalFee: {
            type: Number,
            required: true,
        },
        // admin to b2b markup
        adminB2bMarkup: {
            type: Number,
            required: true,
        },
        // if reseller = b2b ? client = agent : sub-agent,
        clientMarkup: {
            type: Number,
            required: true,
        },
        // agent to sub-agent markup
        subAgentMarkup: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            required: true,
        },
        paymentState: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["non-paid", "partially-paid", "fully-paid"],
        },
        status: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "completed", "cancelled"],
        },
        bookingPNR: {
            type: String,
            required: function () {
                return this.status === "completed";
            },
        },
        identifierToken: {
            type: String,
            required: true,
        },
        otp: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

const B2BFlightOrder = model("B2BFlightOrder", b2bFlightOrderSchema);

module.exports = B2BFlightOrder;
