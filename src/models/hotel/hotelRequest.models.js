const { Schema, model } = require("mongoose");

const hotelRequestSchema = new Schema(
    {
        requestedBy: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["b2b", "b2c"],
        },
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: function () {
                return this.requestedBy === "b2c";
            },
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        checkInDate: {
            type: Date,
            required: true,
        },
        checkOutDate: {
            type: Date,
            required: true,
        },
        noOfAdults: {
            type: Number,
            required: true,
        },
        noOfChildren: {
            type: Number,
            required: true,
        },
        childrenAges: {
            type: [{ type: Number, required: true }],
            required: true,
        },
        hotel: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        roomType: {
            type: Schema.Types.ObjectId,
            ref: "RoomType",
            required: true,
        },
        boardType: {
            type: Schema.Types.ObjectId,
            ref: "HotelBoardType",
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: true,
        },
        phoneNumber: {
            type: Number,
            required: true,
        },
        remarks: {
            type: String,
        },
    },
    { timestamps: true }
);

const HotelRequest = model("HotelRequest", hotelRequestSchema);

module.exports = HotelRequest;
