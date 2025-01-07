const { Schema, model } = require("mongoose");

const b2bOrderSchema = new Schema(
    {
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        orderedBy: {
            type: String,
            required: true,
            enum: ["reseller", "sub-agent"],
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
            ref: "B2BAttractionOrder",
            required: function () {
                return this.isAttraction === true;
            },
        },
        transferId: {
            type: Schema.Types.ObjectId,
            ref: "B2BTransferOrder",
            required: function () {
                return this.isTransfer === true;
            },
        },
        orderStatus: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "completed", "failed", "cancelled", "partially-cancelled"],
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
        isCardPayment: {
            type: Boolean,
            required: true,
            default: false,
        },
        cardCharge: {
            type: Number,
        },
        agentReferenceNumber: {
            type: String,
            required: true,
            lowercase: true,
        },
        referenceNumber: {
            type: String,
            required: true,
        },
        isPromoCodeApplied: {
            type: Boolean,
            required: true,
            default: false,
        },
        promoCode: {
            type: String,
            required: function () {
                return this.isPromoCodeApplied === true;
            },
        },
        promoDiscount: {
            type: Number,
            required: function () {
                return this.isPromoCodeApplied === true;
            },
        },
        isViewed: {
            type: Boolean,
            required: true,
            default: false,
        },
        isCancellationViewed: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const B2BOrder = model("B2BOrder", b2bOrderSchema);

module.exports = B2BOrder;
