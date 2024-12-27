const { Schema, model } = require("mongoose");

const b2cPromoCodeSchema = new Schema(
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
                    ref: "User",
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
            type: String,
            required: function () {
                return this.isValid === true;
            },
        },
        toValidity: {
            type: String,
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
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const B2cPromoCode = model("B2cPromoCode", b2cPromoCodeSchema);

module.exports = B2cPromoCode;
