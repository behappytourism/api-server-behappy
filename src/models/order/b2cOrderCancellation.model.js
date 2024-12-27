const { Schema, model } = require("mongoose");

const b2cOrderCancellationSchema = new Schema(
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
            ref: "B2COrder",
            required: true,
        },
    },
    { timestamps: true }
);

const B2COrderCancellation = model("B2COrderCancellation", b2cOrderCancellationSchema);
module.exports = B2COrderCancellation;
