const { Schema, model } = require("mongoose");

const roomOccupancySchema = new Schema(
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
        isDeleted: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const RoomOccupancy = model("RoomOccupancy", roomOccupancySchema);

module.exports = RoomOccupancy;
