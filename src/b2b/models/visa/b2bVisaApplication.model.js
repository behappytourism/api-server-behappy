const { Schema, model } = require("mongoose");

const visaApplicationSchema = new Schema(
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
        totalAmount: {
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
        subAgentTotalMarkup: {
            type: Number,
            required: function () {
                return this.orderedBy === "sub-agent";
            },
        },
        clientTotalMarkup: {
            type: Number,
            required: true,
            default: 0,
        },
        marketTotalMarkup: {
            type: Number,
            required: true,
            default: 0,
        },
        profileTotalMarkup: {
            type: Number,
            required: true,
            default: 0,
        },
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        orderedBy: {
            type: String,
            required: true,
            enum: ["reseller", "sub-agent"],
        },

        email: {
            type: String,
            required: true,
        },
        contactNo: {
            type: Number,
            required: true,
        },
        otp: {
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
                    paxType: {
                        type: String,
                        enum: ["ADT", "CHD"],
                        required: true,
                    },
                    firstName: {
                        type: String,
                        required: true,
                    },
                    lastName: {
                        type: String,
                        required: true,
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
                    // country: {
                    //     type: Schema.Types.ObjectId,
                    //     ref: "Country",
                    //     required: true,
                    // },
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

const B2BVisaApplication = model("B2BVisaApplication", visaApplicationSchema);

module.exports = B2BVisaApplication;
