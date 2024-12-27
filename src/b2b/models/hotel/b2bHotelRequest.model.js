const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AutoIncrement = require("mongoose-sequence")(mongoose);

const b2bHotelRequestSchema = new Schema(
    {
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
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
        b2bHotelRequestId: {
            type: Number,
        },
    },
    { timestamps: true }
);

b2bHotelRequestSchema.plugin(AutoIncrement, {
    inc_field: "b2bHotelRequestId",
    start_seq: 10000,
});

const B2BHotelRequest = model("B2BHotelRequest", b2bHotelRequestSchema);

module.exports = B2BHotelRequest;
