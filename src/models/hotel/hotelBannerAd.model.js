const { Schema, model } = require("mongoose");

const hotelBannerAdSchema = new Schema(
    {
        hotelId: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        bannerImage: {
            type: String,
            required: true,
        },
        priority: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

const HotelBannerAd = model("HotelBannerAd", hotelBannerAdSchema);

module.exports = HotelBannerAd;
