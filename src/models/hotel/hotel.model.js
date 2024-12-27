const { Schema, model } = require("mongoose");

const hotelSchema = new Schema(
    {
        hotelName: {
            type: String,
            required: true,
            trim: true,
        },
        address: {
            type: String,
            required: function () {
                return this.isPublished === true;
            },
        },
        landMark: {
            type: String,
        },
        street: {
            type: String,
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: function () {
                return this.isPublished === true;
            },
            index: true,
        },
        state: {
            type: Schema.Types.ObjectId,
            ref: "State",
            required: function () {
                return this.isPublished === true;
            },
        },
        city: {
            type: Schema.Types.ObjectId,
            ref: "City",
            required: function () {
                return this.isPublished === true;
            },
        },
        area: {
            type: Schema.Types.ObjectId,
            ref: "Area",
            // required: function () {
            //     return this.isPublished === true;
            // },
        },
        postalCode: {
            type: Number,
        },
        geoCode: {
            latitude: {
                type: String,
                required: function () {
                    return this.isPublished === true;
                },
            },
            longitude: {
                type: String,
                required: function () {
                    return this.isPublished === true;
                },
            },
        },
        hotelChain: {
            type: Schema.Types.ObjectId,
            ref: "HotelChain",
            // required: true,
        },
        // TODO
        // star category
        starCategory: {
            type: String,
            required: function () {
                return this.isPublished === true;
            },
        },
        checkInTime: {
            type: String,
            required: true,
        },
        checkOutTime: {
            type: String,
            required: true,
        },
        amenities: {
            type: [
                {
                    amenity: {
                        type: Schema.Types.ObjectId,
                        ref: "HotelAmenity",
                        required: true,
                    },
                    amenityGroup: {
                        type: Schema.Types.ObjectId,
                        ref: "HotelAmenityGroup",
                        required: true,
                    },
                    isFeatured: {
                        type: Boolean,
                        required: true,
                    },
                    ageFrom: {
                        type: Number,
                    },
                    ageTo: {
                        type: Number,
                    },
                    isPaid: {
                        type: Boolean,
                        required: true,
                    },
                    amount: {
                        type: Number,
                    },
                    applicationType: {
                        type: String,
                    },
                    currency: {
                        type: String,
                    },
                    dateFrom: {
                        type: Date,
                    },
                    dateTo: {
                        type: Date,
                    },
                    description: {
                        type: String,
                    },
                    distance: {
                        type: Number,
                    },
                    order: {
                        type: Number,
                    },
                    timeFrom: {
                        type: String,
                    },
                    timeTo: {
                        type: String,
                    },
                    isVoucher: {
                        type: Boolean,
                        required: true,
                        default: false,
                    },
                },
            ],
            default: [],
        },
        featuredAmenities: {
            type: [
                { amenity: { type: Schema.Types.ObjectId, ref: "HotelAmenity", required: true } },
            ],
            default: [],
        },
        website: {
            type: String,
        },
        roomsCount: { type: Number },
        floorsCount: { type: Number },
        carParkingSlots: { type: Number },
        images: {
            type: [
                {
                    path: { type: String, required: true },
                    isRelative: { type: Boolean, required: true },
                },
            ],
        },
        description: {
            type: String,
            // required: function () {
            //     return this.isPublished === true;
            // },
        },
        faqs: {
            type: [
                {
                    question: {
                        type: String,
                        required: true,
                    },
                    answer: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
        openDays: {
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
        distanceFromCity: {
            type: Number,
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
        accommodationType: {
            type: Schema.Types.ObjectId,
            ref: "AccommodationType",
            required: true,
        },
        bars: {
            type: [
                {
                    name: {
                        type: String,
                        required: true,
                    },
                    barType: {
                        type: String,
                        required: true,
                        enum: ["indoor", "outdoor"],
                    },
                    fromTime: {
                        type: String,
                        required: true,
                    },
                    toTime: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
        restaurants: {
            type: [
                {
                    name: {
                        type: String,
                        required: true,
                    },
                    cuisine: {
                        type: String,
                        required: true,
                    },
                    fromTime: {
                        type: String,
                        required: true,
                    },
                    toTime: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
        isContractAvailable: {
            type: Boolean,
            required: true,
            default: false,
        },
        isApiConnected: {
            type: Boolean,
            required: true,
            default: false,
        },
        connectedApis: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "ApiMaster",
                    required: true,
                },
            ],
            default: [],
        },
        allGuestDetailsRequired: {
            type: Boolean,
            required: true,
            default: false,
        },
        isPublished: {
            type: Boolean,
            required: true,
            default: false,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        hbId: {
            type: Number,
            unique: true,
        },
        ottilaId: {
            type: String,
            unique: true,
        },
        iolxId: {
            type: String,
            unique: true,
        },
        hotelLoadedFrom: {
            type: String,
            enum: ["contract", "hotel-bed"],
            required: true,
        },
        vervotechId: {
            type: Number,
            // required: true,
            // unique: true,
        },
        vervotechIdAdded: {
            type: Boolean,
        },
        ottilaIdAdded: {
            type: Boolean,
        },
    },
    { timestamps: true }
);

hotelSchema.virtual("roomTypes", {
    ref: "RoomType",
    localField: "_id",
    foreignField: "hotel",
});

hotelSchema.virtual("hotelContact", {
    ref: "HotelContact",
    localField: "_id",
    foreignField: "hotel",
    justOne: true,
});

hotelSchema.virtual("contractGroups", {
    ref: "HotelContractGroup",
    localField: "_id",
    foreignField: "hotel",
});

const Hotel = model("Hotel", hotelSchema);

module.exports = Hotel;
