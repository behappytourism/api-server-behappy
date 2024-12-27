const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AutoIncrement = require("mongoose-sequence")(mongoose);

const hotelRequestSchema = new Schema(
    {
        UserId: {
            type: Schema.Types.ObjectId,
            ref: "User",
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
        fromDate: {
            type: Date,
            required: true,
        },
        toDate: {
            type: Date,
            required: true,
        },
        noOfNights: {
            type: Number,
            required: true,
        },
        rooms: {
            type: [
                {
                    noOfAdults: {
                        type: Number,
                        required: true,
                    },
                    noOfChildren: {
                        type: Number,
                        required: true,
                    },
                    childrenAges: {
                        type: [
                            {
                                type: Number,
                                required: true,
                            },
                        ],
                    },
                },
            ],
        },
        roomsCount: {
            type: Number,
            required: true,
        },
        totalAdults: {
            type: Number,
            required: true,
        },
        totalChildren: {
            type: Number,
            required: true,
        },
        boardType: {
            type: Schema.Types.ObjectId,
            ref: "HotelBoardType",
            required: true,
        },
        basePlan: {
            type: Schema.Types.ObjectId,
            ref: "HotelBoardType",
            required: function () {
                return this.isApiConnected === false;
            },
        },
        extraMealSupplement: {
            type: Schema.Types.ObjectId,
            ref: "HotelBoardType",
        },
        addOnSupplements: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "HotelAddOn",
                    required: true,
                },
            ],
        },
        nationality: {
            type: String,
        },
        rateKey: {
            type: String,
            required: true,
        },
        searchId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        hotelRequestId: {
            type: Number,
        },
    },
    { timestamps: true }
);

hotelRequestSchema.plugin(AutoIncrement, {
    inc_field: "hotelRequestId",
    start_seq: 10000,
});

const HotelRequest = model("HotelRequest", hotelRequestSchema);

module.exports = HotelRequest;
