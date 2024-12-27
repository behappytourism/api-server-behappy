const { Schema, model } = require("mongoose");

const InsurnaceContractSchema = new Schema({
    contractId: {
        type: String,
        required: true,
    },
    plan: {
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
        type: String,
        required: true,
    },
    travelTo: {
        type: String,
        required: true,
    },
    travelType: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phoneCode: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: Number,
        required: true,
    },
    address: {
        type: String,
    },
    note: {
        type: String,
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
                },
                passportNumber: {
                    type: String,
                    required: true,
                },
            },
        ],
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
});

const InsurnaceContract = model("InsurnaceContract", InsurnaceContractSchema);

module.exports = InsurnaceContract;
