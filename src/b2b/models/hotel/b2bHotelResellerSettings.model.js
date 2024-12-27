const { Schema, model } = require("mongoose");

const b2bHotelResellerSettingsSchema = new Schema(
    {
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        availableHotels: {
            type: [{ type: Schema.Types.ObjectId, ref: "Hotel", required: true }],
            required: true,
        },
        availableAreas: {
            type: [{ type: Schema.Types.ObjectId, ref: "Area", required: true }],
            required: true,
        },
        availableCities: {
            type: [{ type: Schema.Types.ObjectId, ref: "City", required: true }],
            required: true,
        },
    },
    { timestamps: true }
);

const B2BHotelResellerSettings = model("B2BHotelResellerSettings", b2bHotelResellerSettingsSchema);

module.exports = B2BHotelResellerSettings;
