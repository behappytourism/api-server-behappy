const { Schema, model } = require("mongoose");

const b2bGlobalConfigurationSchema = new Schema(
    {
        hotelBackgroundImages: {
            type: [{ type: String, required: true }],
            default: [],
        },
        showContractHotels: {
            type: Boolean,
            required: true,
        },
        showHotelBedHotels: {
            type: Boolean,
            required: true,
        },
        showOttilaHotels: {
            type: Boolean,
            required: true,
        },
        showIolxHotels: {
            type: Boolean,
            required: true,
        },
        settingsNumber: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

const B2BGlobalConfiguration = model("B2BGlobalConfiguration", b2bGlobalConfigurationSchema);

module.exports = B2BGlobalConfiguration;
