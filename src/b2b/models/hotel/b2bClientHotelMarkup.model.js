const { Schema, model } = require("mongoose");

const b2bClientHotelMarkupSchema = new Schema(
    {
        markupType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["flat", "percentage"],
        },
        markup: {
            type: Number,
            required: true,
        },
        hotelId: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        roomTypeId: {
            type: Schema.Types.ObjectId,
            ref: "RoomType",
            required: true,
        },
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
    },
    { timestamps: true }
);

const B2BClientHotelMarkup = model("B2BClientHotelMarkup", b2bClientHotelMarkupSchema);

module.exports = B2BClientHotelMarkup;
