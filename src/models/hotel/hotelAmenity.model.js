const { Schema, model } = require("mongoose");

const hotelAmenitySchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        parentAmenity: {
            type: Schema.Types.ObjectId,
            ref: "HotelAmenity",
            required: true,
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

const HotelAmenity = model("HotelAmenity", hotelAmenitySchema);

module.exports = HotelAmenity;
