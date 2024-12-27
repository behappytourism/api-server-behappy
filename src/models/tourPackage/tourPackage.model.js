const mongoose = require("mongoose");
const slug = require("mongoose-slug-generator");
const { Schema, model } = mongoose;

mongoose.plugin(slug);

const tourPackageSchema = new Schema(
    {
        packageType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["static", "dynamic"],
        },
        thumbnail: {
            type: [],
            required: true,
        },
        packageName: {
            type: String,
            required: true,
        },
        slug: {
            type: String,
            slug: ["packageName"],
            unique: true,
        },
        overveiw: {
            type: String,
            required: true,
        },
        packageThemes: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "TourPackageTheme",
                    required: true,
                },
            ],
            required: true,
        },
        noOfDays: {
            type: Number,
            required: true,
        },
        isCustomDate: {
            type: Boolean,
            required: true,
        },
        availableDates: {
            type: [
                {
                    startDate: {
                        type: Date,
                        required: true,
                    },
                    endDate: {
                        type: Date,
                        required: true,
                    },
                },
            ],
        },
        excludedDates: {
            type: [
                {
                    startDate: {
                        type: Date,
                        required: true,
                    },
                    endDate: {
                        type: Date,
                        required: true,
                    },
                },
            ],
        },
        // transfers: {
        //     type: [
        //         {
        //             departureDateTime: {
        //                 type: Date,
        //                 required: true,
        //             },
        //             transferFrom: {
        //                 type: String,
        //                 required: true,
        //             },
        //             transferTo: {
        //                 type: String,
        //                 required: true,
        //             },
        //             vehicleType: {
        //                 type: Schema.Types.ObjectId,
        //                 ref: "VehicleType",
        //                 required: true,
        //             },
        //         },
        //     ],
        //     required: true,
        // },
        itineraries: {
            type: [
                {
                    title: {
                        type: String,
                        required: true,
                    },
                    itineraryItems: {
                        type: [
                            {
                                attractionId: {
                                    type: Schema.Types.ObjectId,
                                    ref: "Attraction",
                                    required: true,
                                },
                                activityId: {
                                    type: Schema.Types.ObjectId,
                                    ref: "AttractionActivity",
                                    required: true,
                                },
                                transferType: {
                                    type: String,
                                    required: true,
                                },
                                // vehicleTypeId: {
                                //     type: Schema.Types.ObjectId,
                                // },
                                itineraryName: {
                                    type: String,
                                    requiraed: true,
                                },
                                description: {
                                    type: String,
                                    required: true,
                                },
                                price: {
                                    type: Number,
                                    required: true,
                                },
                            },
                        ],
                        required: true,
                    },
                },
            ],
            required: true,
        },
        hotels: {
            type: [
                {
                    country: {
                        type: Schema.Types.ObjectId,
                        ref: "Country",
                        required: true,
                    },
                    city: {
                        type: Schema.Types.ObjectId,
                        ref: "City",
                        required: true,
                    },
                    title: {
                        type: String,
                        required: true,
                    },
                    noOfNights: {
                        type: Number,
                        required: true,
                    },
                    hotelOptions: {
                        type: [
                            {
                                hotelId: {
                                    type: Schema.Types.ObjectId,
                                    ref: "Hotel",
                                    required: true,
                                },
                                roomTypeId: {
                                    type: Schema.Types.ObjectId,
                                    required: true,
                                },
                                boardCode: {
                                    type: String,
                                    required: true,
                                },
                                price: {
                                    type: Number,
                                    required: function () {
                                        return this.packageType === "dynamic";
                                    },
                                },
                            },
                        ],
                        required: true,
                    },
                    price: {
                        type: Number,
                        required: function () {
                            return this.packageType === "static";
                        },
                    },
                },
            ],
            required: true,
        },
        isAirportTransfer: {
            type: Boolean,
            required: true,
        },
        airportTransferPrice: {
            type: Number,
            required: function () {
                return this.isAirportTransfer === true;
            },
        },
        isInterHotelTransfer: {
            type: Boolean,
            required: true,
        },
        interHotelPrice: {
            type: Number,
            required: function () {
                return this.isInterHotelTransfer === true;
            },
        },
        totalPrice: {
            type: Number,
            required: true,
        },
        inclusions: {
            type: String,
            required: true,
        },
        exclusions: {
            type: String,
            required: true,
        },
        // cancellationPolicy: {
        //     type: String,
        //     required: true,
        // },
        visaPolicy: {
            type: String,
            // required: true,
        },
        termsAndConditions: {
            type: String,
            required: true,
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: true,
        },
        destination: {
            type: Schema.Types.ObjectId,
            ref: "Destination",
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    { timestamps: true }
);

tourPackageSchema.virtual("itineraries.itineraryItems.activity", {
    ref: "AttractionActivity",
    localField: "itineraries.itineraryItems.activityId",
    foreignField: "_id",
    justOne: true,
});

tourPackageSchema.virtual("hotels.hotelOptions.hotel", {
    ref: "Hotel",
    localField: "hotels.hotelOptions.hotelId",
    foreignField: "_id",
    justOne: true,
});

tourPackageSchema.virtual("hotels.hotelOptions.roomType", {
    ref: "RoomType",
    localField: "hotels.hotelOptions.roomTypeId",
    foreignField: "_id",
    justOne: true,
});

const TourPackage = model("TourPackage", tourPackageSchema);

module.exports = TourPackage;
