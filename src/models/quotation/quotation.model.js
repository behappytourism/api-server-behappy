const { Schema, model } = require("mongoose");

const quotationSchema = new Schema(
    {
        quotationNumber: {
            type: Number,
            required: true,
        },
        agentQuotationNumber: {
            type: String,
        },
        isResellerDisabled: {
            type: Boolean,
            required: true,
        },
        amendment: {
            type: Schema.Types.ObjectId,
            ref: "QuotationAmendment",
            required: true,
        },
        totalAmendments: {
            type: Number,
            required: true,
            default: 1,
        },
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: function () {
                return this.isResellerDisabled === false;
            },
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
        },
        status: {
            type: String,
            enum: ["confirmed", "not-confirmed"],
            default: "not-confirmed",
            lowercase: true,
            required: true,
        },
        confirmedBy: {
            type: String,
            enum: ["admin", "reseller"],
            lowercase: true,
            required: function () {
                return this.status === "confirmed";
            },
        },
        confirmedAmendment: {
            type: Schema.Types.ObjectId,
            ref: "QuotationAmendment",
            required: function () {
                return this.status === "confirmed";
            },
        },
        comments: {
            type: String,
        },
        isVoucherCreated: {
            type: Boolean,
        },
        voucherId: {
            type: Schema.Types.ObjectId,
            isVoucherCreated: function () {
                return this.isVoucherCreated === true;
            },
        },
    },
    { timestamps: true }
);

quotationSchema.virtual("amendments", {
    ref: "QuotationAmendment",
    localField: "quotationNumber",
    foreignField: "quotationNumber",
});

const Quotation = model("Quotation", quotationSchema);

module.exports = Quotation;
