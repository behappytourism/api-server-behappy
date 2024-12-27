const { Schema, model } = require("mongoose");

const hotelStarCategorySchema = new Schema(
    {
        categoryCode: {
            type: String,
            required: true,
            uppercase: true,
            unique: true,
        },
        categoryName: {
            type: String,
            required: true,
        },
        order: {
            type: Number,
            required: true,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    { timestamps: true }
);

const HotelStarCategory = model("HotelStarCategory", hotelStarCategorySchema);

module.exports = HotelStarCategory;
