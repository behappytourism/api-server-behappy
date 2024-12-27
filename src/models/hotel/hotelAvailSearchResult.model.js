const { Schema, model } = require("mongoose");

const hotelAvailSearchResultSchema = new Schema(
    {
        processTime: {
            type: Number,
            required: true,
        },
        hotels: {
            type: [
                {
                    hotel: {},
                    rooms: [],
                    minRate: {
                        type: Number,
                        required: true,
                    },
                    maxRate: {
                        type: Number,
                        // required: true,
                    },
                    totalOffer: {
                        type: Number,
                        required: true,
                    },
                    noOfNights: {
                        type: Number,
                        required: true,
                    },
                },
            ],
            required: true,
        },
        filters: {},
        fromDate: {
            type: Date,
            required: true,
        },
        toDate: {
            type: Date,
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
                    childrenAges: [{ type: Number, required: true }],
                },
            ],
            default: [],
        },
        totalHotels: {
            type: Number,
            required: true,
        },
        expiresIn: {
            type: Date,
            required: true,
        },
        nationality: {
            type: String,
        },
        hotelBedRowRes: {},
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            // required: true,
            index: true,
        },
    },
    { timestamps: true }
);

const HotelAvailSearchResult = model("HotelAvailSearchResult", hotelAvailSearchResultSchema);

module.exports = HotelAvailSearchResult;
