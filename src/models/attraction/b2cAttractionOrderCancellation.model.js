const { Schema, model } = require("mongoose");

const b2cAttractionCancellationSchema = new Schema(
    {
        cancelledBy: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["admin", "b2c"],
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
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "AttractionOrder",
            required: true,
        },
        activityId: {
            type: String,
            required: true,
        },
        activity: { type: Schema.Types.ObjectId, ref: "AttractionActivity" },
        activityName: { type: String },
    },
    { timestamps: true }
);

const B2CAttractionOrderCancellation = model(
    "B2CAttractionOrderCancellation",
    b2cAttractionCancellationSchema
);
module.exports = B2CAttractionOrderCancellation;
