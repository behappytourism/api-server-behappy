const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const jwt = require("jsonwebtoken");

const AutoIncrement = require("mongoose-sequence")(mongoose);

const VendorSchema = new Schema(
    {
        vendorCode: {
            type: Number,
        },

        name: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        skypeId: {
            type: String,
        },
        whatsappNumber: {
            type: String,
            required: true,
        },
        telephoneNumber: {
            type: String,
        },
        designation: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        jwtToken: {
            type: String,
        },

        status: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "ok", "cancelled", "disabled"],
        },
        otp: {
            type: Number,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        avatarImg: {
            type: String,
        },
        b2bUserId: {
            type: Schema.Types.ObjectId,
            ref: "B2bUser",
            required: true,
        },
    },
    { timestamps: true }
);

VendorSchema.plugin(AutoIncrement, {
    inc_field: "vendorCode",
    start_seq: 10000,
});

VendorSchema.methods.toJSON = function () {
    const vendor = this;
    const vendorObj = vendor.toObject();

    delete vendorObj.password;
    delete vendorObj.jwtToken;

    return vendorObj;
};

VendorSchema.methods.generateAuthToken = async function () {
    try {
        const vendor = this;
        const jwtToken = jwt.sign(
            {
                _id: vendor._id.toString(),
                email: vendor?.email?.toString(),
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        vendor.jwtToken = jwtToken;
        return jwtToken;
    } catch (err) {
        throw new Error(err);
    }
};

const Vendor = model("Vendor", VendorSchema);

module.exports = Vendor;
