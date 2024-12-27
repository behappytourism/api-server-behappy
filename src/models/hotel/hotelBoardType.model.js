const { Schema, model } = require("mongoose");

const hotelBoardTypeSchema = new Schema(
    {
        boardName: {
            type: String,
            required: true,
        },
        boardShortName: {
            type: String,
            required: true,
            uppercase: true,
            unique: true,
        },
        subNames: {
            type: [String],
            required: true,
            default: [],
        },
    },
    { timestamps: true }
);

const HotelBoardType = model("HotelBoardType", hotelBoardTypeSchema);

module.exports = HotelBoardType;
