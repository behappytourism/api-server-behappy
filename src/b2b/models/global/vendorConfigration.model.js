const { Schema, model } = require("mongoose");

const vendorConfigurationSchema = new Schema(
    {
        vendor: {
            type: Schema.Types.ObjectId,
            ref: "Vendor",
            required: true,
        },
        showAttraction: {
            type: Boolean,
            required: true,
            default: false,
        },
        showHotel: {
            type: Boolean,
            required: true,
            default: false,
        },
        showFlight: {
            type: Boolean,
            required: true,
            default: false,
        },
        showVisa: {
            type: Boolean,
            required: true,
            default: true,
        },
        showA2a: {
            type: Boolean,
            required: true,
            default: false,
        },
        showQuotaion: {
            type: Boolean,
            required: true,
            default: false,
        },
        showInsurance: {
            type: Boolean,
            required: true,
            default: false,
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
    },
    { timestamps: true }
);

const VendorConfiguration = model("VendorConfiguration", vendorConfigurationSchema);

module.exports = VendorConfiguration;
