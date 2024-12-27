const { Schema, model } = require("mongoose");

const hotelOrderCancellationSchema = new Schema(
    {
        cancelledBy: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["admin", "b2b"],
        },
        adminId: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        cancellationCharge: {
            type: Number,
        },
        cancellationRemark: {
            type: String,
        },
        cancellationStatus: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "success", "failed"],
        },
        cancellationProvider: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["tctt", "hotel-beds"],
        },
        cancellationChargeHotelBed: {
            type: Number,
            required: function () {
                return this.cancellationProvider === "hotel-beds";
            },
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "HotelOrder",
            required: true,
        },
    },
    { timestamps: true }
);

const HotelOrderCancellation = model("HotelOrderCancellation", hotelOrderCancellationSchema);

module.exports = HotelOrderCancellation;
