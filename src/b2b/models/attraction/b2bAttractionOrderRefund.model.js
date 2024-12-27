const { Schema, model } = require("mongoose");

const b2bAttractionOrderRefundSchema = new Schema(
    {
        amount: {
            type: Number,
            required: true,
        },
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
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
            ref: "B2BAttractionOrder",
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

const B2BAttractionOrderRefund = model("B2BAttractionOrderRefund", b2bAttractionOrderRefundSchema);

module.exports = B2BAttractionOrderRefund;
