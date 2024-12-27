const { Schema, model } = require("mongoose");

const hotelAllocationSchema = new Schema(
    {
        hotel: {
            type: Schema.Types.ObjectId,
            ref: "HotelPromotion",
            required: true,
        },
        roomType: {
            type: Schema.Types.ObjectId,
            ref: "RoomType",
            required: true,
        },
        // TODO:
        // remove this after update
        // contract: {
        //     type: Schema.Types.ObjectId,
        //     ref: "HotelContract",
        //     // required: true,
        // },
        contractGroup: {
            type: Schema.Types.ObjectId,
            ref: "ContractGroup",
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        allocationType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["free-sale", "stop-sale", "static", "on-request"],
        },
        rateType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["all-promotions", "contract-rate"],
            default: "all-promotions",
        },
        releaseDate: {
            type: Number,
            required: function () {
                return this.allocationType === "static" || this.allocationType === "free-sale";
            },
        },
        unitWise: {
            type: String,
            lowercase: true,
            required: function () {
                return this.allocationType === "static";
            },
        },
        allocation: {
            type: Number,
            required: function () {
                return this.allocationType === "static";
            },
        },
        bookedAllocations: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { timestamps: true }
);

const HotelAllocation = model("HotelAllocation", hotelAllocationSchema);

module.exports = HotelAllocation;
