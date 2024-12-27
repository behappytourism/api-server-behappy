const { Schema, model } = require("mongoose");

const ottilaRoomRateInfoSchema = new Schema(
    {
        roomCategory: {
            type: String,
            required: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
        },
        resellerId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        rateKey: {
            type: String,
            required: true,
        },
        cityId: {
            type: Number,
            required: true,
        },
        nationalityId: {
            type: String,
            required: true,
        },
        checkInDate: {
            type: String,
            required: true,
        },
        checkOutDate: {
            type: String,
            required: true,
        },
        hCode: {
            type: String,
            required: true,
        },
        roomDetail: {
            type: [
                {
                    RoomSrNo: {
                        type: Number,
                        required: true,
                    },
                    NoOfAdult: {
                        type: Number,
                        required: true,
                    },
                    NoOfChild: {
                        type: Number,
                        required: true,
                    },
                    ChildAges: {
                        type: [Number],
                        required: false,
                    },
                    RateKey: {
                        type: String,
                        required: false,
                    },
                },
            ],
        },
        actions: {
            type: [
                {
                    type: {
                        type: String,
                        required: true,
                    },
                    tokenId: {
                        type: String,
                        required: true,
                    },
                    hKey: {
                        type: String,
                        required: true,
                    },
                    rateKey: {
                        type: String,
                        required: false,
                    },
                },
            ],
        },
        policies: {
            type: Array,
            required: false,
        },
        amount: {
            type: Number,
            required: true,
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
            enum: ["confirmed", "pending", "cancelled"],
        },
        statusCode: {
            type: String,
            required: false,
        },
        currency: {
            type: String,
            required: false,
        },
        apiRefNo: {
            type: String,
            required: false,
        },
        voucherBooking: {
            type: Boolean,
            required: true,
            default: true,
        },
        packageRate: {
            type: Boolean,
            required: true,
        },
    },
    { timestamps: true }
);

const OttilaRoomRateInfo = model("OttilaRoomRateInfo", ottilaRoomRateInfoSchema);

module.exports = OttilaRoomRateInfo;
