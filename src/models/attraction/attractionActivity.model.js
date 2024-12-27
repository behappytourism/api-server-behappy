const { Schema, model } = require("mongoose");

const attractionActivitySchema = new Schema(
    {
        attraction: {
            type: Schema.Types.ObjectId,
            ref: "Attraction",
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        activityType: {
            type: String,
            required: true,
            enum: ["normal", "transfer"],
        },
        base: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["person", "private", "hourly"],
        },
        description: {
            type: String,
        },
        adultAgeLimit: {
            type: Number,
            required: true,
        },
        childAgeLimit: {
            type: Number,
            required: true,
        },
        infantAgeLimit: {
            type: Number,
            required: true,
        },
        adultCost: {
            type: Number,
            required: function () {
                return this.base === "person" && this.activityType === "normal";
            },
        },
        childCost: {
            type: Number,
            required: function () {
                return this.base === "person" && this.activityType === "normal";
            },
        },
        infantCost: {
            type: Number,
            // required: true,
        },
        hourlyCost: {
            type: Number,
            required: function () {
                return this.base === "hourly";
            },
        },

        isVat: {
            type: Boolean,
            required: true,
        },
        vat: {
            type: Number,
            required: function () {
                return this.isVat === true;
            },
        },
        isSharedTransferAvailable: {
            type: Boolean,
            required: true,
        },
        sharedTransferPrice: {
            type: Number,
            required: function () {
                return this.isSharedTransferAvailable === true;
            },
        },
        sharedTransferCost: {
            type: Number,
            required: function () {
                return this.isSharedTransferAvailable === true;
            },
        },
        isPrivateTransferAvailable: {
            type: Boolean,
            required: true,
        },
        privateTransfers: {
            type: [
                {
                    name: { type: String, required: true },
                    maxCapacity: { type: Number, required: true },
                    price: { type: Number, required: true },
                    cost: { type: Number, required: true },
                },
            ],
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        isB2cActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        isB2bActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        peakTime: {
            type: Date,
        },
        note: {
            type: String,
        },
        productId: {
            type: String,
        },
        productCode: {
            type: String,
        },
        isApiSync: {
            type: Boolean,
            required: true,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        isQuotation: {
            type: Boolean,
            required: true,
            default: false,
        },
        qtnActivityType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["ticket", "transfer"],
            required: function () {
                return this.isQuotation === true;
            },
        },
        isPromoCode: {
            type: Boolean,
            required: true,
            default: false,
        },
        promoCode: {
            type: String,
            uppercase: true,
            required: function () {
                return this.isPromoCode === true;
            },
        },
        promoAmountAdult: {
            type: Number,
            required: function () {
                return this.isPromoCode === true;
            },
        },
        promoAmountChild: {
            type: Number,
            required: function () {
                return this.isPromoCode === true;
            },
        },
        isB2bPromoCode: {
            type: Boolean,
            required: true,
            default: false,
        },
        b2bPromoCode: {
            type: String,
            uppercase: true,
            required: function () {
                return this.isB2bPromoCode === true;
            },
        },
        b2bPromoAmountAdult: {
            type: Number,
            required: function () {
                return this.isB2bPromoCode === true;
            },
        },
        b2bPromoAmountChild: {
            type: Number,
            required: function () {
                return this.isB2bPromoCode === true;
            },
        },
        images: {
            type: [{ type: String, required: true }],
            // required: true,
        },
        termsAndConditions: {
            type: String,
        },
        overview: {
            type: String,
        },
        inculsionsAndExclusions: {
            type: String,
        },
    },
    { timestamps: true }
);

const AttractionActivity = model("AttractionActivity", attractionActivitySchema);

module.exports = AttractionActivity;
