const { Schema, model } = require("mongoose");

const hotelAddOnSchema = new Schema(
    {
        hotel: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        fromDate: {
            type: Date,
            required: true,
        },
        toDate: {
            type: Date,
            required: true,
        },
        roomTypes: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "RoomType",
                    required: true,
                },
            ],
        },
        boardTypes: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "HotelBoardType",
                    required: true,
                },
            ],
        },
        addOnName: {
            type: String,
            required: true,
        },
        applyOn: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pax", "room"],
        },
        adultPrice: {
            type: Number,
            required: function () {
                return this.applyOn === "pax";
            },
        },
        childPrice: {
            type: Number,
            required: function () {
                return this.applyOn === "pax";
            },
        },
        infantPrice: {
            type: Number,
            required: function () {
                return this.applyOn === "pax";
            },
        },
        roomPrice: {
            type: Number,
            required: function () {
                return this.applyOn === "room";
            },
        },
        isMandatory: {
            type: Boolean,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const HotelAddOn = model("HotelAddOn", hotelAddOnSchema);

module.exports = HotelAddOn;
