const { Schema, model } = require("mongoose");

const hotelBedRoomTypeSchema = new Schema(
    {
        hbId: {
            type: String,
            required: true,
        },
        hotel: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        roomName: {
            type: String,
            required: true,
        },
        isParentRoom: {
            type: Boolean,
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
        isRelative: {
            type: Boolean,
            required: true,
        },
        amenities: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "HotelAmenity",
                    required: true,
                },
            ],
        },
        images: {
            type: [
                {
                    path: { type: String, required: true },
                    isRelative: { type: Boolean, required: true },
                },
            ],
        },
    },
    { timestamps: true }
);

const HotelBedRoomType = model("HotelBedRoomType", hotelBedRoomTypeSchema);

module.exports = HotelBedRoomType;
