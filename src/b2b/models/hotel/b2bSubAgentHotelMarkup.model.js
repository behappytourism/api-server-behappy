const { Schema, model } = require("mongoose");

const b2bSubAgentHotelMarkupSchema = new Schema(
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

const B2BSubAgentHotelMarkup = model("B2BSubAgentHotelMarkup", b2bSubAgentHotelMarkupSchema);

module.exports = B2BSubAgentHotelMarkup;
