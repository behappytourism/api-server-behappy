const { Schema, model } = require("mongoose");

const b2bTransferOrderCancellationSchema = new Schema(
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
            ref: "B2BTransferOrder",
            required: true,
        },
        transferId: {
            type: String,
            required: true,
        },
        transferName: { type: String },
    },
    { timestamps: true }
);

const B2BTransferOrderCancellation = model(
    "B2BTransferOrderCancellation",
    b2bTransferOrderCancellationSchema
);

module.exports = B2BTransferOrderCancellation;
