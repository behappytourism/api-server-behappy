const { Schema, model } = require("mongoose");

const hotelOrderSchema = new Schema(
    {
        referenceNumber: {
            type: String,
            required: true,
        },
        isApiConnected: {
            type: Boolean,
            required: true,
        },
        supplier: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["tctt", "hotel-beds"],
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        hotel: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        roomType: {
            type: Schema.Types.ObjectId,
            ref: "RoomType",
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
        noOfNights: {
            type: Number,
            required: true,
        },
        rooms: {
            type: [
                {
                    noOfAdults: {
                        type: Number,
                        required: true,
                    },
                    noOfChildren: {
                        type: Number,
                        required: true,
                    },
                    childrenAges: {
                        type: [
                            {
                                type: Number,
                                required: true,
                            },
                        ],
                    },
                },
            ],
        },
        roomsCount: {
            type: Number,
            required: true,
        },
        totalAdults: {
            type: Number,
            required: true,
        },
        totalChildren: {
            type: Number,
            required: true,
        },
        boardType: {
            type: Schema.Types.ObjectId,
            ref: "HotelBoardType",
            required: true,
        },
        basePlan: {
            type: Schema.Types.ObjectId,
            ref: "HotelBoardType",
            required: function () {
                return this.isApiConnected === false;
            },
        },
        extraMealSupplement: {
            type: Schema.Types.ObjectId,
            ref: "HotelBoardType",
        },
        selectedRoomOccupancies: {
            type: [
                {
                    occupancyId: {
                        type: Schema.Types.ObjectId,
                        // required: true,
                    },
                    occupancyName: {
                        type: String,
                        required: true,
                    },
                    shortName: {
                        type: String,
                        // required: true,
                    },
                    count: {
                        type: Number,
                        required: true,
                    },
                    price: {
                        type: Number,
                        required: true,
                    },
                    extraBedApplied: {
                        type: Number,
                        required: true,
                    },
                    rollBedApplied: {
                        type: Number,
                        required: true,
                    },
                },
            ],
            required: true,
        },
        contracts: {
            type: [
                {
                    date: {
                        type: Date,
                        required: true,
                    },
                    contractGroup: {
                        type: Schema.Types.ObjectId,
                        ref: "HotelContractGroup",
                        required: true,
                    },
                    contract: {
                        type: Schema.Types.ObjectId,
                        ref: "HotelContract",
                        required: true,
                    },
                    isSpecialRate: {
                        type: Boolean,
                        required: true,
                    },
                    appliedRateCode: {
                        type: String,
                        required: function () {
                            return this.isSpecialRate === true;
                        },
                    },
                    roomPrice: {
                        type: Number,
                        required: true,
                    },
                    mealSupplementPrice: {
                        type: Number,
                        required: true,
                    },
                    extraBedSupplementPrice: {
                        type: Number,
                        required: true,
                    },
                    childSupplementPrice: {
                        type: Number,
                        required: true,
                    },
                    netPrice: {
                        type: Number,
                        required: true,
                    },
                    offerAppliedPrice: {
                        type: Number,
                        required: true,
                    },
                },
            ],
        },
        travellerDetails: {
            type: [
                {
                    roomId: {
                        type: Number,
                        required: true,
                    },
                    title: {
                        type: String,
                        required: true,
                        lowercase: true,
                        enum: ["mr", "mrs", "ms"],
                    },
                    firstName: {
                        type: String,
                        required: true,
                    },
                    lastName: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
        mandatoryAddOnPrice: {
            type: Number,
            required: true,
        },
        mandatoryAddOns: {
            type: [
                {
                    dates: {
                        type: [{ type: Date, required: true }],
                        required: true,
                    },
                    addOnId: {
                        type: Schema.Types.ObjectId,
                        ref: "HotelAddOn",
                        required: true,
                    },
                    addOnName: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
        addOnSupplementPrice: {
            type: Number,
            required: true,
        },
        addOnSupplements: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "HotelAddOn",
                    required: true,
                },
            ],
        },
        totalAddOnPrice: {
            type: Number,
            required: true,
        },
        contactDetails: {
            country: {
                type: Schema.Types.ObjectId,
                ref: "Country",
                required: true,
            },
            phoneNumber: {
                type: Number,
                required: true,
            },
            email: {
                type: String,
                required: true,
            },
        },
        specialRequest: {
            type: String,
        },
        mealSupplementPrice: {
            type: Number,
            required: true,
        },
        extraBedSupplementPrice: {
            type: Number,
            required: true,
        },
        childSupplementPrice: {
            type: Number,
            required: true,
        },
        stayPayOffer: {
            type: Number,
            required: true,
        },
        discountOffer: {
            type: Number,
            required: true,
        },
        appliedMealUpgrades: {
            type: [
                {
                    promotion: {
                        type: Schema.Types.ObjectId,
                        ref: "HotelPromotion",
                        required: true,
                    },
                    rateCode: {
                        type: String,
                        required: true,
                    },
                    dates: [{ type: Date, required: true }],
                },
            ],
            required: true,
        },
        appliedRoomTypeUpgrades: {
            type: [
                {
                    promotion: {
                        type: Schema.Types.ObjectId,
                        ref: "HotelPromotion",
                        required: true,
                    },
                    rateCode: {
                        type: String,
                        required: true,
                    },
                    dates: [{ type: Date, required: true }],
                },
            ],
            required: true,
        },
        appliedStayPays: {
            type: [
                {
                    promotion: {
                        type: Schema.Types.ObjectId,
                        ref: "HotelPromotion",
                        required: true,
                    },
                    rateCode: {
                        type: String,
                        required: true,
                    },
                    dates: [{ type: Date, required: true }],
                    discount: {
                        type: Number,
                        required: true,
                    },
                },
            ],
            required: true,
        },
        appliedDiscounts: {
            type: [
                {
                    promotion: {
                        type: Schema.Types.ObjectId,
                        ref: "HotelPromotion",
                        required: true,
                    },
                    rateCode: {
                        type: String,
                        required: true,
                    },
                    dates: [{ type: Date, required: true }],
                    discount: {
                        type: Number,
                        required: true,
                    },
                },
            ],
            required: true,
        },
        // applied meal, and room promotions in array of text
        appliedPromotions: {
            type: [{ type: String, required: true }],
            required: true,
        },
        totalOffer: {
            type: Number,
            required: true,
        },
        roomPrice: {
            type: Number,
            required: true,
        },
        netPrice: {
            type: Number,
            required: true,
        },
        grossPrice: {
            type: Number,
            required: true,
        },
        // admin to market markup
        // adminMarketMarkup: {
        //     type: Number,
        //     required: true,
        // },

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
            enum: ["created", "booked", "confirmed", "cancelled"],
        },
        isCancellationPending: {
            type: Boolean,
            required: true,
            default: false,
        },
        hotelBookingId: {
            type: String,
            required: function () {
                return this.status === "confirmed";
            },
        },
        rateKey: {
            type: String,
            required: true,
        },
        cancellationPolicies: {
            type: [
                {
                    amount: {
                        type: Number,
                        required: true,
                    },
                    from: {
                        type: Date,
                        required: true,
                    },
                },
            ],
            required: true,
        },
        lastStatusChange: {
            type: Date,
            required: true,
        },
        rateComments: {
            type: [{ type: String, required: true }],
            required: true,
        },
        supplierName: {
            type: String,
        },
        vatNumber: {
            type: String,
        },
        nationality: {
            type: String,
        },
        isTourismFeeIncluded: {
            type: Boolean,
            required: function () {
                return this.isApiConnected === false;
            },
        },
        lastDateForPayment: {
            type: Date,
        },
        expiresIn: {
            type: Date,
            required: true,
        },
        otp: {
            type: Number,
        },
        searchId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
    },
    { timestamps: true }
);

const HotelOrder = model("HotelOrder", hotelOrderSchema);

module.exports = HotelOrder;
