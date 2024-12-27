const { Schema, model } = require("mongoose");
const jwt = require("jsonwebtoken");

const adminSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            lowercase: true,
            unique: true,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        designation: {
            type: String,
            required: true,
        },
        joinedDate: {
            type: Date,
        },
        city: {
            type: String,
        },
        country: {
            type: String,
            required: true,
            uppercase: true,
        },
        description: {
            type: String,
        },
        password: {
            type: String,
            required: true,
        },
        roles: {
            type: [{ type: Schema.Types.ObjectId, ref: "AdminRole", required: true }],
            required: true,
        },
        lastLoggedIn: {
            type: Date,
        },
        jwtToken: {
            type: String,
        },
        avatar: {
            type: String,
        },
        marketStrategy: {
            type: Schema.Types.ObjectId,
            ref: "MarketStrategy",
        },
    },
    { timestamps: true }
);

adminSchema.methods.toJSON = function () {
    const admin = this;
    const adminObj = admin.toObject();

    delete adminObj.password;
    delete adminObj.jwtToken;

    return adminObj;
};

adminSchema.methods.generateAuthToken = async function () {
    try {
        const admin = this;
        const jwtToken = jwt.sign(
            { _id: admin._id.toString(), email: admin?.email?.toString() },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        admin.jwtToken = jwtToken;
        return jwtToken;
    } catch (err) {
        throw new Error(err);
    }
};

const Admin = model("Admin", adminSchema);

module.exports = Admin;
