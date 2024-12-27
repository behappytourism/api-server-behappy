const { Schema, model } = require("mongoose");

const featuredHotelSchema = new Schema(
    {
        hotelId: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
            unique: true,
        },
        hotelName: {
            type: String,
            required: true,
        },
        thumbnail: {
            path: {
                type: String,
                required: true,
            },
            isRelative: {
                type: Boolean,
                required: true,
            },
        },
        tagLine: {
            type: String,
        },
        showHomePage: {
            type: Boolean,
            required: true,
            default: false,
        },
        priority: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

const FeaturedHotel = model("FeaturedHotel", featuredHotelSchema);

module.exports = FeaturedHotel;
