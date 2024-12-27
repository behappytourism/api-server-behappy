const { Schema, model } = require("mongoose");

const resellerConfigurationSchema = new Schema(
    {
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        showAttraction: {
            type: Boolean,
            required: true,
            default: true,
        },
        showHotel: {
            type: Boolean,
            required: true,
            default: true,
        },
        showFlight: {
            type: Boolean,
            required: true,
            default: true,
        },
        showVisa: {
            type: Boolean,
            required: true,
            default: true,
        },
        showA2a: {
            type: Boolean,
            required: true,
            default: true,
        },
        showQuotaion: {
            type: Boolean,
            required: true,
            default: true,
        },
        showInsurance: {
            type: Boolean,
            required: true,
            default: true,
        },
        allowedPaymentMethods: {
            type: [
                {
                    type: String,
                    required: true,
                    lowercase: true,
                    enum: ["wallet", "ccavenue", "pay-later"],
                },
            ],
            required: true,
        },

        isApi_available: {
            type: Boolean,
            required: true,
            default: false,
        },
        showAttractionApi: {
            type: Boolean,
            required: true,
            default: false,
        },
        showHotelApi: {
            type: Boolean,
            required: true,
            default: false,
        },
        showFlightApi: {
            type: Boolean,
            required: true,
            default: false,
        },
        showVisaApi: {
            type: Boolean,
            required: true,
            default: false,
        },
        showA2aApi: {
            type: Boolean,
            required: true,
            default: false,
        },
        showQuotaionApi: {
            type: Boolean,
            required: true,
            default: false,
        },
        showInsuranceApi: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const ResellerConfiguration = model("ResellerConfiguration", resellerConfigurationSchema);

module.exports = ResellerConfiguration;
