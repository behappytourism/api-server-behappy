const { Schema, model } = require("mongoose");

const hotelChainSchema = new Schema(
    {
        chainCode: {
            type: String,
            required: true,
            uppercase: true,
            unique: true,
        },
        chainName: {
            type: String,
            required: true,
        },
        hotelGroup: {
            type: Schema.Types.ObjectId,
            ref: "HotelGroup",
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    { timestamps: true }
);

const HotelChain = model("HotelChain", hotelChainSchema);

module.exports = HotelChain;
