const { Schema, model } = require("mongoose");

const b2bHotelOrderCancellationSchema = new Schema(
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
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
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
            enum: ["tctt", "hotel-beds", "ottila", "iolx"],
        },
        cancellationChargeHotelBed: {
            type: Number,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "B2BHotelOrder",
            required: true,
        },
    },
    { timestamps: true }
);

const B2BHotelOrderCancellation = model(
    "B2BHotelOrderCancellation",
    b2bHotelOrderCancellationSchema
);

module.exports = B2BHotelOrderCancellation;
