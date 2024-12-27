const { Schema, model } = require("mongoose");

const roomTypeSchema = new Schema(
    {
        hotel: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        roomName: {
            type: String,
            required: true,
        },
        serviceBy: {
            type: String,
            required: true,
            uppercase: true,
            enum: ["DAY", "NIGHT"],
        },
        roomOccupancies: {
            type: [
                {
                    occupancyName: {
                        type: String,
                        required: true,
                    },
                    shortName: {
                        type: String,
                        required: true,
                    },
                    combinations: {
                        type: [
                            {
                                adultCount: {
                                    type: Number,
                                    required: true,
                                },
                                childCount: {
                                    type: Number,
                                    required: true,
                                },
                                infantCount: {
                                    type: Number,
                                    required: true,
                                },
                            },
                        ],
                        required: true,
                    },
                    maxCount: {
                        type: Number,
                        required: true,
                    },
                    extraBed: {
                        type: Number,
                        required: true,
                    },
                    rollBed: {
                        type: Number,
                        required: true,
                    },
                    displayName: {
                        type: String,
                    },
                    isActive: {
                        type: Boolean,
                        required: true,
                    },
                },
            ],
        },
        adultAgeFrom: {
            type: Number,
            required: true,
        },
        adultAgeTo: {
            type: Number,
            required: true,
        },
        childAgeFrom: {
            type: Number,
            required: true,
        },
        childAgeTo: {
            type: Number,
            required: true,
        },
        infantAgeFrom: {
            type: Number,
            required: true,
        },
        infantAgeTo: {
            type: Number,
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
        description: {
            type: String,
        },
        areaInM2: {
            type: Number,
        },
        images: {
            type: [
                {
                    path: { type: String, required: true },
                    isRelative: { type: Boolean, required: true },
                },
            ],
        },
        hotelBedRooms: {
            type: [
                {
                    type: String,
                    required: true,
                },
            ],
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
        hotelLoadedFrom: {
            type: String,
            enum: ["contract", "hotel-bed"],
            required: true,
        },
        tempString: {
            type: String,
        },
    },
    { timestamps: true }
);

const RoomType = model("RoomType", roomTypeSchema);

module.exports = RoomType;
