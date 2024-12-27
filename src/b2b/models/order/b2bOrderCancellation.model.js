const { Schema, model } = require("mongoose");

const b2bOrderCancellationSchema = new Schema(
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
            ref: "B2BOrder",
            required: true,
        },
    },
    { timestamps: true }
);

const B2BOrderCancellation = model("B2BOrderCancellation", b2bOrderCancellationSchema);
module.exports = B2BOrderCancellation;
