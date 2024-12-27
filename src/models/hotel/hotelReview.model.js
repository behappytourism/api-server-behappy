const { Schema, model } = require("mongoose");

const hotelReviewSchema = new Schema(
    {
        hotel: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const HotelReview = model("HotelReview", hotelReviewSchema);

module.exports = HotelReview;
