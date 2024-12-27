const { Schema, model } = require("mongoose");

const b2bAttractionOrderCancellationSchema = new Schema(
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
            enum: ["tctt"],
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "B2BAttractionOrder",
            required: true,
        },
    },
    { timestamps: true }
);

const B2BAttractionOrderCancellation = model(
    "B2BAttractionOrderCancellation",
    b2bAttractionOrderCancellationSchema
);

module.exports = B2BAttractionOrderCancellation;
