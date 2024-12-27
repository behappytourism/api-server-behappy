const { Schema, model } = require("mongoose");

const visaEnquirySchema = new Schema(
    {
        requestedBy: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["b2b", "b2c"],
        },
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: function () {
                return this.requestedBy === "b2b";
            },
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        whatsapp: { type: Number, required: true },
        nationality: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        message: {
            type: String,
            required: true,
        },
    },

    { timestamps: true }
);

const VisaEnquiry = model("VisaEnquiry", visaEnquirySchema);

module.exports = VisaEnquiry;
