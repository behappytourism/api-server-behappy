const { Schema, model } = require("mongoose");

const iolxRoomRateInfoSchema = new Schema(
    {
        roomType: {
            type: String,
            required: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        nationality: {
            type: String,
            required: true,
        },
        fromDate: {
            type: String,
            required: true,
        },
        toDate: {
            type: String,
            required: true,
        },
        hotelCode: {
            type: String,
            required: true,
        },
        tokenNumber: {
            type: String,
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
                        type: [Number],
                        required: false,
                    },
                },
            ],
        },
        rateDetails: {
            type: {
                roomNo: {
                    type: Number,
                    required: true,
                },
                roomTypeCode: {
                    type: Number,
                    required: true,
                },
                contractTokenId: {
                    type: String,
                    required: true,
                },
                mealPlanCode: {
                    type: String,
                    required: true,
                },
                roomConfigurationId: {
                    type: Number,
                    required: true,
                },
                rate: {
                    type: Number,
                    required: true,
                },
                rateKey: {
                    type: String,
                    required: true,
                },
                currencyCode: {
                    type: String,
                    required: true,
                },
                subResNo: {
                    type: String,
                    required: false,
                },
            },
        },
        policies: {
            type: Array,
            required: false,
        },
        bookingCompleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        bookingStatus: {
            type: String,
            required: false,
            lowercase: true,
            enum: ["confirmed", "cancelled"],
        },
        bookingNumber: {
            type: String,
            required: false,
        },
        source: {
            type: Number,
            required: false,
        },
    },
    { timestamps: true }
);

const IolxRoomRateInfo = model("IolxRoomRateInfo", iolxRoomRateInfoSchema);

module.exports = IolxRoomRateInfo;
