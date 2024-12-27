const { Schema, model } = require("mongoose");

const B2BHotelProviderSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        configurations: {
            type: {
                allGuestDetailsRequired: {
                    type: Boolean,
                    required: true,
                    default: false,
                },
                hasRoomTypeAvailable: {
                    type: Boolean,
                    required: true,
                    default: true,
                },
                ageRequired: {
                    type: Boolean,
                    required: true,
                    default: false,
                },
                genderRequired: {
                    type: Boolean,
                    required: true,
                    default: false,
                },
            },
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
    },
    { timestamps: true }
);

const B2BHotelProvider = model("B2BHotelProvider", B2BHotelProviderSchema);

module.exports = B2BHotelProvider;
