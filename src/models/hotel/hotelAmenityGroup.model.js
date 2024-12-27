const { Schema, model } = require("mongoose");

const hotelAmenityGroupSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        hbId: {
            type: Number,
        },
        icon: {
            type: String,
        },
    },
    { timestamps: true }
);

const HotelAmenityGroup = model("HotelAmenityGroup", hotelAmenityGroupSchema);

module.exports = HotelAmenityGroup;
