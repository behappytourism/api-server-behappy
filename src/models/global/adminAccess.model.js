const { Schema, model } = require("mongoose");

const adminAccessSchema = new Schema(
    {
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        a2as: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Admin",
                    required: true,
                },
            ],
        },
        fligths: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Admin",
                    required: true,
                },
            ],
        },
        hotels: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Admin",
                    required: true,
                },
            ],
        },
        visas: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Admin",
                    required: true,
                },
            ],
        },
        attractions: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Admin",
                    required: true,
                },
            ],
        },
        quotations: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Admin",
                    required: true,
                },
            ],
        },
        visas: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "Admin",
                    required: true,
                },
            ],
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const AdminB2bAccess = model("AdminAccess", adminAccessSchema);

module.exports = AdminB2bAccess;
