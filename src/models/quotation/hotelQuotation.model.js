const { Schema, model } = require("mongoose");

const hotelQuotationSchema = new Schema(
    {
        isAlreadyBooked: {
            type: Boolean,
            required: true,
            default: false,
        },
        stays: [
            {
                hotels: [
                    {
                        hotelId: {
                            type: Schema.Types.ObjectId,
                            ref: "Hotel",
                            required: true,
                        },
                        checkInDate: {
                            type: Date,
                            required: true,
                        },
                        checkOutDate: {
                            type: Date,
                            required: true,
                        },
                        hotelName: {
                            type: String,
                            required: true,
                        },
                        state: {
                            type: String,
                        },
                        city: {
                            type: String,
                        },
                        cityId: {
                            type: Schema.Types.ObjectId,
                            ref: "City",
                            required: true,
                        },
                        area: {
                            type: String,
                        },
                        areaId: {
                            type: Schema.Types.ObjectId,
                            ref: "Area",
                        },
                        country: {
                            type: String,
                        },
                        starCategory: {
                            type: String,
                        },
                        roomTypeId: {
                            type: String,
                        },
                        roomTypeName: {
                            type: String,
                        },
                        boardTypeCode: {
                            type: String,
                        },
                        isCustomHotelMarkup: {
                            type: Boolean,
                            required: true,
                            default: false,
                        },
                        roomOccupancies: [
                            {
                                occupancyShortName: {
                                    type: String,
                                    required: true,
                                },

                                price: {
                                    type: Number,
                                },
                                profileMarkup: {
                                    type: Number,
                                },
                                marketMarkup: {
                                    type: Number,
                                },
                                cost: {
                                    type: Number,
                                },
                            },
                        ],
                    },
                ],
                roomOccupancyList: [
                    {
                        occupancyShortName: {
                            type: String,
                            required: function () {
                                return this.isAlreadyBooked === false;
                            },
                        },
                        price: {
                            type: Number,
                            required: function () {
                                return this.isAlreadyBooked === false;
                            },
                        },
                        priceWithTransfer: {
                            type: Number,
                            required: function () {
                                return this.isAlreadyBooked === false;
                            },
                        },
                        perPersonProfileMarkup: {
                            type: Number,
                            required: function () {
                                return this.isAlreadyBooked === false;
                            },
                        },
                        perPersonMarketMarkup: {
                            type: Number,
                            required: function () {
                                return this.isAlreadyBooked === false;
                            },
                        },
                    },
                ],
                selected: {
                    type: Boolean,
                    default: false,
                    required: true,
                },
            },
        ],
    },
    { timestamps: true }
);

const HotelQuotation = model("HotelQuotation", hotelQuotationSchema);

module.exports = HotelQuotation;
