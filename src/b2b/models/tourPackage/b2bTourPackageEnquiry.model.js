const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AutoIncrement = require("mongoose-sequence")(mongoose);

const b2bTourPackageEnquirySchema = new Schema(
    {
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        tourPackageId: {
            type: Schema.Types.ObjectId,
            ref: "TourPackage",
            required: true,
        },
        noOfAdults: {
            type: Number,
            required: true,
        },
        noOfChildren: {
            type: Number,
            required: true,
        },
        departureDate: {
            type: Date,
            required: true,
        },
        isFlightBooked: {
            type: Boolean,
            required: true,
            default: false,
        },
        remarks: {
            type: String,
        },
        tPRefNumber: {
            type: Number,
        },
    },
    { timestamps: true }
);

b2bTourPackageEnquirySchema.plugin(AutoIncrement, {
    inc_field: "tPRefNumber",
    start_seq: 10000,
});

const B2BTourPackageEnquiry = model("B2BTourPackageEnquiry", b2bTourPackageEnquirySchema);

module.exports = B2BTourPackageEnquiry;
