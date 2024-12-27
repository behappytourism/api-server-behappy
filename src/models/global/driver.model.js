const { Schema, model } = require("mongoose");

const driverSchema = new Schema(
    {
        driverName: {
            type: String,
            required: true,
        },
        nationality: {
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
        whatsappNumber: {
            type: String,
            required: true,
        },
        licenseNumber: {
            type: String,
            required: true,
        },
        licenseExpDate: {
            type: Date,
            required: true,
        },
        availLicenseTypes: {
            type: [{ type: Schema.Types.ObjectId, ref: "LicenseType", required: true }],
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    { timestamps: true }
);

const Driver = model("Driver", driverSchema);

module.exports = Driver;
