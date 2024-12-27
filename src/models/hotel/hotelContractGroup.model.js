const { Schema, model } = require("mongoose");

const hotelContractGroupSchema = new Schema(
    {
        contractName: {
            type: String,
            required: true,
        },
        contractCode: {
            type: String,
            required: true,
        },
        hotel: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    { timestamps: true }
);

const HotelContractGroup = model("HotelContractGroup", hotelContractGroupSchema);

module.exports = HotelContractGroup;
