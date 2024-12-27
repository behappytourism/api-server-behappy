const { Schema, model } = require("mongoose");

const hotelPromotionSchema = new Schema(
    {
        promotionCode: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        hotel: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        contractGroups: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "HotelContractGroup",
                    required: true,
                },
            ],
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
        },
        sellFrom: {
            type: Date,
            required: true,
        },
        sellTo: {
            type: Date,
            required: true,
        },
        isCombinedPromotion: {
            type: Boolean,
            required: true,
        },
        combinedPromotions: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "HotelPromotion",
                    required: true,
                },
            ],
        },
        isDiscountAvailable: {
            type: Boolean,
            required: true,
        },
        isApplicableForExtraBed: {
            type: Boolean,
            required: true,
        },
        isApplicableForSupplement: {
            type: Boolean,
            required: true,
        },
        isApplicableForAddOn: {
            type: Boolean,
            required: true,
        },
        discounts: {
            type: [
                {
                    rateCode: {
                        type: String,
                        required: true,
                    },
                    fromDate: {
                        type: Date,
                        required: true,
                    },
                    toDate: {
                        type: Date,
                        required: true,
                    },
                    bookBefore: {
                        type: Number,
                        required: true,
                    },
                    boardTypes: {
                        type: [
                            {
                                type: Schema.Types.ObjectId,
                                ref: "HotelBoardType",
                                required: true,
                            },
                        ],
                    },
                    minimumLengthOfStay: {
                        type: Number,
                        required: true,
                    },
                    maximumLengthOfStay: {
                        type: Number,
                        required: true,
                    },
                    discountType: {
                        type: String,
                        required: true,
                        lowercase: true,
                        enum: ["flat", "percentage"],
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
                                        discount: {
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
        isStayPayAvailable: {
            type: Boolean,
            required: true,
        },
        stayPays: {
            type: [
                {
                    rateCode: {
                        type: String,
                        required: true,
                    },
                    fromDate: {
                        type: Date,
                        required: true,
                    },
                    toDate: {
                        type: Date,
                        required: true,
                    },
                    bookBefore: {
                        type: Number,
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
                    boardTypes: {
                        type: [
                            {
                                type: Schema.Types.ObjectId,
                                ref: "HotelBoardType",
                                required: true,
                            },
                        ],
                    },
                    stayCount: {
                        type: Number,
                        required: true,
                    },
                    freeCount: {
                        type: Number,
                        required: true,
                    },
                },
            ],
        },
        multipleStayPay: {
            type: Boolean,
            required: true,
        },
        stayPayFreeOn: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["cheapest", "first-night", "last-night", "highest"],
        },
        mealUpgradeOn: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["base-plan", "extra-supplement", "both"],
        },
        isMealUpgradeAvailable: {
            type: Boolean,
            required: true,
        },
        mealUpgrades: {
            type: [
                {
                    rateCode: {
                        type: String,
                        required: true,
                    },
                    fromDate: {
                        type: Date,
                        required: true,
                    },
                    toDate: {
                        type: Date,
                        required: true,
                    },
                    bookBefore: {
                        type: Number,
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
                    mealFrom: {
                        type: Schema.Types.ObjectId,
                        ref: "HotelBoardType",
                        required: true,
                    },
                    mealTo: {
                        type: Schema.Types.ObjectId,
                        ref: "HotelBoardType",
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
                },
            ],
        },
        isRoomTypeUpgradeAvailable: {
            type: Boolean,
            required: true,
        },
        roomTypeUpgrades: {
            type: [
                {
                    rateCode: {
                        type: String,
                        required: true,
                    },
                    fromDate: {
                        type: Date,
                        required: true,
                    },
                    toDate: {
                        type: Date,
                        required: true,
                    },
                    bookBefore: {
                        type: Number,
                        required: true,
                    },
                    boardTypes: {
                        type: [
                            {
                                type: Schema.Types.ObjectId,
                                ref: "HotelBoardType",
                                required: true,
                            },
                        ],
                    },
                    roomTypeFrom: {
                        type: Schema.Types.ObjectId,
                        ref: "RoomType",
                        required: true,
                    },
                    roomTypeTo: {
                        type: Schema.Types.ObjectId,
                        ref: "RoomType",
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
                },
            ],
        },
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
        priority: {
            type: Number,
            required: true,
        },
        bookingWindowFrom: {
            type: Date,
            required: true,
        },
        bookingWindowTo: {
            type: Date,
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
                    uppercase: true,
                    required: true,
                },
            ],
            default: [],
        },
        // showPromoBanner: {
        //     type: Boolean,
        //     required: true,
        //     default: false,
        // },
        // promoBannerImage: {
        //     type: String,
        //     required: function () {
        //         return this.showPromoBanner === true;
        //     },
        // },
        applicableOnRatePromotion: {
            type: Boolean,
            required: true,
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
        isActive: {
            type: Boolean,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const HotelPromotion = model("HotelPromotion", hotelPromotionSchema);

module.exports = HotelPromotion;
