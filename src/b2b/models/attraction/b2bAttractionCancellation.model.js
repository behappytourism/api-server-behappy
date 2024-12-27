const { Schema, model } = require("mongoose");

const b2bAttractionCancellationSchema = new Schema(
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
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "B2BAttractionOrder",
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

const B2BAttractionOrderCancellation = model(
    "B2BAttractionCancellation",
    b2bAttractionCancellationSchema
);
module.exports = B2BAttractionOrderCancellation;
