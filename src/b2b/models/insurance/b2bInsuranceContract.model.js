const { Schema, model } = require("mongoose");

const InsurnaceContractSchema = new Schema(
    {
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        plan: {
            type: Schema.Types.ObjectId,
            ref: "InsurancePlan",
            required: true,
        },
        planName: {
            type: String,
            required: true,
        },
        residence: {
            type: String,
            required: true,
        },
        destination: {
            type: String,
            required: true,
        },
        travelFrom: {
            type: Date,
            required: true,
        },
        travelTo: {
            type: Date,
            required: true,
        },
        travelType: {
            type: String,
            required: true,
        },
        beneficiaryData: {
            type: [
                {
                    firstName: {
                        type: String,
                        required: true,
                    },
                    lastName: {
                        type: String,
                        required: true,
                    },
                    dateOfBirth: {
                        type: String,
                        required: true,
                    },
                    gender: {
                        type: String,
                        required: true,
                        lowercase: true,
                        enum: ["male", "female"],
                    },
                    passportNumber: {
                        type: String,
                        required: true,
                    },
                    consecutiveDays: {
                        type: String,
                        required: true,
                    },
                    price: {
                        type: Number,
                        required: true,
                    },
                    priceId: {
                        type: Number,
                        required: true,
                    },
                },
            ],
        },
        totalAmountWithoutDiscount: {
            type: Number,
            required: true,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "completed", "failed"],
        },
        referenceNumber: {
            type: String,
            required: true,
        },
        markup: {
            type: Number,
            required: true,
        },
        contractId: {
            type: String,
            required: function () {
                return this.status === "completed";
            },
        },
        otp: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

const B2bInsurnaceContract = model("B2bInsurnaceContract", InsurnaceContractSchema);

module.exports = B2bInsurnaceContract;
