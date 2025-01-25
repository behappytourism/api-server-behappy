const { Schema, model } = require("mongoose");

const b2cOrderSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: true,
        },
        netPrice: {
            type: Number,
            required: true,
        },
        netProfit: {
            type: Number,
            required: true,
        },
        netCost: {
            type: Number,
            required: true,
        },
        isAttraction: {
            type: Boolean,
            required: true,
        },
        isTransfer: {
            type: Boolean,
            required: true,
        },
        attractionId: {
            type: Schema.Types.ObjectId,
            ref: "AttractionOrder",
            required: function () {
                return this.isAttraction === true;
            },
        },
        transferId: {
            type: Schema.Types.ObjectId,
            ref: "B2CTransferOrder",
            required: function () {
                return this.isTransfer === true;
            },
        },
        orderStatus: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "completed", "failed", "partially-cancelled", "cancelled"],
        },
        paymentState: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["non-paid", "partially-paid", "fully-paid"],
        },
        otp: {
            type: Number,
        },
        referenceNumber: {
            type: String,
            required: true,
        },
        isViewed: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const B2COrder = model("B2COrder", b2cOrderSchema);

module.exports = B2COrder;
