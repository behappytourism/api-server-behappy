const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const jwt = require("jsonwebtoken");

const AutoIncrement = require("mongoose-sequence")(mongoose);

const b2bUserSchema = new Schema(
    {
        companyName: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        website: {
            type: String,
            required: true,
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        zipCode: {
            type: Number,
        },
        trnNumber: {
            type: String,
        },
        companyRegistration: {
            type: String,
        },
        companyLogo: {
            type: String,
        },
        shortName: {
            type: String,
        },
        status: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "ok", "cancelled", "disabled"],
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const B2bUser = model("B2bUser", b2bUserSchema);

module.exports = B2bUser;
