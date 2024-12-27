const { Schema, model } = require("mongoose");

const b2cVisaApplicationSchema = new Schema(
    {
        visaType: {
            type: Schema.Types.ObjectId,
            ref: "VisaType",
            required: true,
        },
        nationality: {
            type: Schema.Types.ObjectId,
            ref: "VisaNationality",
            required: true,
        },
        totalAdultPrice: {
            type: Number,
            required: true,
        },
        totalChildPrice: {
            type: Number,
            required: true,
        },
        totalPrice: {
            type: Number,
            required: true,
        },
        totalAdultCost: {
            type: Number,
            required: true,
        },
        totalChildCost: {
            type: Number,
            required: true,
        },
        totalCost: {
            type: Number,
            required: true,
        },
        profit: {
            type: Number,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        contactNo: {
            type: Number,
            required: true,
        },
        noOfAdult: {
            type: Number,
            required: true,
        },
        noOfChild: {
            type: Number,
            required: true,
        },
        travellers: {
            type: [
                {
                    title: {
                        type: String,
                        required: true,
                        enum: ["mr", "ms", "mrs", "mstr"],
                        lowercase: true,
                    },
                    firstName: {
                        type: String,
                        required: true,
                    },
                    lastName: {
                        type: String,
                        required: true,
                    },
                    paxType: {
                        type: String,
                        required: true,
                        enum: ["ADT", "CHD"],
                        uppercase: true,
                    },
                    expiryDate: {
                        day: {
                            type: Number,
                            required: true,
                        },
                        month: {
                            type: Number,
                            required: true,
                        },
                        year: {
                            type: Number,
                            required: true,
                        },
                    },

                    dateOfBirth: {
                        day: {
                            type: Number,
                            required: true,
                        },
                        month: {
                            type: Number,
                            required: true,
                        },
                        year: {
                            type: Number,
                            required: true,
                        },
                    },
                    country: {
                        type: Schema.Types.ObjectId,
                        ref: "Country",
                        required: true,
                    },
                    passportNo: {
                        type: String,
                        required: true,
                    },
                    contactNo: {
                        type: Number,
                        required: true,
                    },
                    email: {
                        type: String,
                        required: true,
                    },
                    isStatus: {
                        type: String,
                        enum: ["initiated", "submitted", "approved", "rejected"],
                        default: "initiated",
                    },
                    visaUpload: {
                        type: String,
                    },
                    reason: {
                        type: String,
                    },

                    documents: {
                        type: Schema.Types.ObjectId,
                        ref: "VisaDocument",
                    },
                },
            ],
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        isDocumentUploaded: {
            type: Boolean,
            default: false,
            required: true,
        },
        status: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["initiated", "payed"],
            default: "initiated",
        },
        referenceNumber: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const B2cVisaApplicationSchema = model("B2CVisaApplicationSchema", b2cVisaApplicationSchema);

module.exports = B2cVisaApplicationSchema;
