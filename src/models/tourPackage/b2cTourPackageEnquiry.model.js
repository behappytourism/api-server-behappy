const { Schema, model } = require("mongoose");

const b2cTourPackageEnquirySchema = new Schema(
    {
        tourPackageId: {
            type: Schema.Types.ObjectId,
            ref: "TourPackage",
            required: true,
        },
        name: { type: String, required: true },
        email: { type: String, required: true },
        countryCode: { type: String, required: true, uppercase: true },
        phoneNumber: { type: String, required: true },
        fromDate: { type: Date, required: true },
        adultCount: { type: Number, required: true },
        childrenCount: { type: Number, required: true },
        isFlightBooked: { type: Boolean, required: true },
        remarks: { type: String },
    },
    { timestamps: true }
);

const B2CTourPackageEnquiry = model("B2CTourPackageEnquiry", b2cTourPackageEnquirySchema);

module.exports = B2CTourPackageEnquiry;
