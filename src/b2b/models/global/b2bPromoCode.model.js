const { Schema, model } = require("mongoose");

const b2bPromoCodeSchema = new Schema(
    {
        product: {
            type: [
                {
                    type: String,
                    required: true,
                    enum: ["attraction", "transfer", "a2a", "hotel"],
                    required: true,
                },
            ],
        },
        code: {
            type: String,
            required: true,
            uppercase: true,
            unique: true,
        },
        type: {
            type: String,
            required: true,
            enum: ["percentage", "flat"],
            required: true,
        },
        value: {
            type: Number,
            required: true,
        },
        isSpecific: {
            type: Boolean,
            required: true,
            default: false,
        },
        users: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Reseller",
                    required: function () {
                        return this.isSpecific === true;
                    },
                },
            ],
        },
        isValid: {
            type: Boolean,
            required: true,
            default: false,
        },
        fromValidity: {
            type: Date,
            required: function () {
                return this.isValid === true;
            },
        },
        toValidity: {
            type: Date,
            required: function () {
                return this.isValid === true;
            },
        },
        maxPromoDiscount: {
            type: Number,
            required: true,
        },
        minPurchaseValue: {
            type: Number,
            required: true,
        },
        useagePerPersonCount: {
            type: Number,
            required: true,
        },
        useageCount: {
            type: Number,
            required: true,
        },
        totalUsed: {
            type: Number,
            required: true,
            default: 0,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        orders: {
            type: [
                {
                    resellerId: {
                        type: Schema.Types.ObjectId,
                        ref: "Reseller",
                    },
                    orderId: {
                        type: Schema.Types.ObjectId,
                        ref: "Order",
                    },
                    discountAmount: {
                        type: Number,
                        required: true,
                    },
                },
            ],
        },
    },
    { timestamps: true }
);

const B2bPromoCode = model("B2bPromoCode", b2bPromoCodeSchema);

module.exports = B2bPromoCode;
