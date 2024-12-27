const { Schema, model } = require("mongoose");

const b2cTransferOrderCancellationSchema = new Schema(
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
            ref: "B2CTransferOrder",
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

const B2CTransferOrderCancellation = model(
    "B2CTransferOrderCancellation",
    b2cTransferOrderCancellationSchema
);

module.exports = B2CTransferOrderCancellation;
