const { Schema, model } = require("mongoose");

const hotelHbRateCommentSchema = new Schema(
    {
        incoming: { type: Number },
        hotel: { type: Number },
        code: { type: String },
        commentsByRates: [],
    },
    { timestamps: true }
);

const HotelHbRateComment = model("HotelHbRateComment", hotelHbRateCommentSchema);

module.exports = HotelHbRateComment;
