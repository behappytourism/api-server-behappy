const { Schema, model } = require("mongoose");

const hotelContractSchema = new Schema(
    {
        rateCode: {
            type: String,
            required: true,
        },
        rateName: {
            type: String,
            required: true,
        },
        hotel: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        contractGroup: {
            type: Schema.Types.ObjectId,
            ref: "HotelContractGroup",
            required: true,
        },
        basePlan: {
            type: Schema.Types.ObjectId,
            ref: "HotelBoardType",
            required: true,
        },
        checkInTime: {
            type: String,
            required: true,
        },
        checkOutTime: {
            type: String,
            required: true,
        },
        sellFrom: {
            type: Date,
            required: true,
        },
        sellTo: {
            type: Date,
            required: true,
        },
        priority: {
            type: Number,
            required: true,
        },
        isSpecialRate: {
            type: Boolean,
            required: true,
        },
        parentContract: {
            type: Schema.Types.ObjectId,
            ref: "HotelContract",
            required: function () {
                return this.isSpecialRate === true;
            },
        },
        bookingWindowFrom: {
            type: Date,
            required: function () {
                return this.isSpecialRate === true;
            },
        },
        bookingWindowTo: {
            type: Date,
            required: function () {
                return this.isSpecialRate === true;
            },
        },
        inclusions: {
            type: String,
        },
        roomRates: {
            type: [
                {
                    rateCode: {
                        type: String,
                    },
                    fromDate: {
                        type: Date,
                        required: true,
                    },
                    toDate: {
                        type: Date,
                        required: true,
                    },
                    validDays: {
                        type: [
                            {
                                type: String,
                                required: true,
                                lowercase: true,
                                enum: [
                                    "sunday",
                                    "monday",
                                    "tuesday",
                                    "wednesday",
                                    "thursday",
                                    "friday",
                                    "saturday",
                                ],
                            },
                        ],
                        required: true,
                    },
                    minimumLengthOfStay: {
                        type: Number,
                        required: true,
                    },
                    maximumLengthOfStay: {
                        type: Number,
                        required: true,
                    },
                    roomTypes: {
                        type: [
                            {
                                roomTypeId: {
                                    type: Schema.Types.ObjectId,
                                    ref: "RoomType",
                                    required: true,
                                },
                                roomOccupancies: [
                                    {
                                        occupancyId: {
                                            type: Schema.Types.ObjectId,
                                            required: true,
                                        },
                                        shortName: {
                                            type: String,
                                            required: true,
                                        },
                                        price: {
                                            type: Number,
                                            // required: true,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        },
        mealSupplements: {
            type: [
                {
                    fromDate: {
                        type: Date,
                        required: true,
                    },
                    toDate: {
                        type: Date,
                        required: true,
                    },
                    boardType: {
                        type: Schema.Types.ObjectId,
                        ref: "HotelBoardType",
                        required: true,
                    },
                    roomTypes: {
                        type: [
                            {
                                type: Schema.Types.ObjectId,
                                ref: "RoomType",
                                required: true,
                            },
                        ],
                    },
                    adultPrice: {
                        type: Number,
                        required: true,
                    },
                    childPrice: {
                        type: Number,
                        required: true,
                    },
                    infantPrice: {
                        type: Number,
                        required: true,
                    },
                },
            ],
        },
        extraSupplements: {
            type: [
                {
                    fromDate: {
                        type: Date,
                        required: true,
                    },
                    toDate: {
                        type: Date,
                        required: true,
                    },
                    roomTypes: {
                        type: [
                            {
                                type: Schema.Types.ObjectId,
                                ref: "RoomType",
                                required: true,
                            },
                        ],
                    },
                    extraBedAdultPrice: {
                        type: Number,
                        required: true,
                    },
                    extraBedChildPrice: {
                        type: Number,
                        required: true,
                    },
                    isMealIncluded: {
                        type: Boolean,
                        required: true,
                    },
                    exbMealPriceAdult: {
                        type: Number,
                        required: function () {
                            return this.isMealIncluded === false;
                        },
                    },
                    exbMealPriceChild: {
                        type: Number,
                        required: function () {
                            return this.isMealIncluded === false;
                        },
                    },
                },
            ],
        },
        childPolicies: {
            type: [
                {
                    fromDate: {
                        type: Date,
                        required: true,
                    },
                    toDate: {
                        type: Date,
                        required: true,
                    },
                    roomTypes: {
                        type: [
                            {
                                type: Schema.Types.ObjectId,
                                ref: "RoomType",
                                required: true,
                            },
                        ],
                    },
                    fromAge: {
                        type: Number,
                        required: true,
                    },
                    toAge: {
                        type: Number,
                        required: true,
                    },
                    policies: {
                        type: [
                            {
                                paxCount: {
                                    type: Number,
                                    required: true,
                                },
                                beddingIclusive: {
                                    type: Boolean,
                                    required: true,
                                },
                                beddingCharge: {
                                    type: Number,
                                    // required: true,
                                },
                                mealInclusive: {
                                    type: Boolean,
                                    required: true,
                                },
                                mealCharge: {
                                    type: Number,
                                    // required: true,
                                },
                            },
                        ],
                        required: true,
                    },
                },
            ],
        },
        // childMealPolicies: {
        //     type: [
        //         {
        //             fromDate: {
        //                 type: Date,
        //                 required: true,
        //             },
        //             toDate: {
        //                 type: Date,
        //                 required: true,
        //             },
        //             roomTypes: {
        //                 type: [
        //                     {
        //                         type: Schema.Types.ObjectId,
        //                         ref: "RoomType",
        //                         required: true,
        //                     },
        //                 ],
        //             },
        //             boardTypes: {
        //                 type: [
        //                     {
        //                         type: Schema.Types.ObjectId,
        //                         ref: "HotelBoardType",
        //                         required: true,
        //                     },
        //                 ],
        //             },
        //             fromAge: {
        //                 type: Number,
        //                 required: true,
        //             },
        //             toAge: {
        //                 type: Number,
        //                 required: true,
        //             },
        //             isFree: {
        //                 type: Boolean,
        //                 required: true,
        //             },
        //             totalFreePax: {
        //                 type: Number,
        //                 required: true,
        //             },
        //             isManualRate: {
        //                 type: Boolean,
        //                 required: true,
        //             },
        //             rate: {
        //                 type: Number,
        //                 required: true,
        //             },
        //         },
        //     ],
        // },
        cancellationPolicies: {
            type: [
                {
                    fromDate: {
                        type: Date,
                        required: true,
                    },
                    toDate: {
                        type: Date,
                        required: true,
                    },
                    roomTypes: {
                        type: [
                            {
                                type: Schema.Types.ObjectId,
                                ref: "RoomType",
                                required: true,
                            },
                        ],
                    },
                    cancellationType: {
                        type: String,
                        required: true,
                        lowercase: true,
                        enum: ["refundable", "non-refundable"],
                    },
                    cancellationChargeType: {
                        type: String,
                        required: function () {
                            return this.cancellationType === "refundable";
                        },
                        lowercase: true,
                        enum: ["flat", "percentage", "night"],
                    },
                    daysBefore: {
                        type: Number,
                        required: function () {
                            return this.cancellationType !== "non-refundable";
                        },
                    },
                    cancellationCharge: {
                        type: Number,
                        required: function () {
                            return this.cancellationType !== "non-refundable";
                        },
                    },
                    requestCancelDaysBefore: {
                        type: Number,
                        required: function () {
                            return this.cancellationType !== "non-refundable";
                        },
                    },
                },
            ],
        },
        termsAndConditions: {
            type: String,
            required: true,
        },
        contractFile: {
            type: String,
        },
        isTourismFeeIncluded: {
            type: Boolean,
            required: true,
        },
        specificNations: {
            type: Boolean,
            required: true,
        },
        applicableNations: {
            type: [
                {
                    type: String,
                    required: true,
                },
            ],
            default: [],
        },
        excludedDates: {
            type: [
                {
                    fromDate: {
                        type: Date,
                        required: true,
                    },
                    toDate: {
                        type: Date,
                        required: true,
                    },
                    roomTypes: {
                        type: [{ type: String, required: true }],
                    },
                },
            ],
            required: true,
            default: [],
        },
        // this indicates whether discount promotion applicable or not on this contract
        applyPromotion: {
            type: Boolean,
            required: true,
            default: true,
        },
        status: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending-approval", "approved", "not-approved", "inactive"],
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const HotelContract = model("HotelContract", hotelContractSchema);

module.exports = HotelContract;
