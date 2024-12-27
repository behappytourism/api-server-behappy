const { Schema, model } = require("mongoose");

const hotelBedAllRoomTypeSchema = new Schema(
    {
        hbId: {
            type: String,
            required: true,
        },
        roomName: {
            type: String,
            required: true,
        },
        minPax: {
            type: Number,
            required: true,
        },
        maxPax: {
            type: Number,
            required: true,
        },
        maxAdults: {
            type: Number,
            required: true,
        },
        minAdults: {
            type: Number,
            required: true,
        },
        maxChildren: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

const HotelBedAllRoomType = model("HotelBedAllRoomType", hotelBedAllRoomTypeSchema);

module.exports = HotelBedAllRoomType;
