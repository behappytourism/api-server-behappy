const { Schema, model } = require("mongoose");

const hotelGroupSchema = new Schema(
    {
        groupName: {
            type: String,
            required: true,
        },
        groupCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
    },
    { timestamps: true }
);

const HotelGroup = model("HotelGroup", hotelGroupSchema);

module.exports = HotelGroup;
