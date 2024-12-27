const { Schema, model } = require("mongoose");

const b2cAttractionOrderRefundSchema = new Schema(
    {
        amount: {
            type: Number,
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        paymentMethod: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["wallet"],
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
        note: {
            type: String,
        },
        status: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "success", "failed"],
        },
        activity: { type: Schema.Types.ObjectId, ref: "AttractionActivity", required: true },
        activityName: { type: String, required: true },
    },
    { timestamps: true }
);

const B2CAttractionOrderRefund = model("B2CAttractionOrderRefund", b2cAttractionOrderRefundSchema);

module.exports = B2CAttractionOrderRefund;
