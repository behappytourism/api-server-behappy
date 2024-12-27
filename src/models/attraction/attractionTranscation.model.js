const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AutoIncrement = require("mongoose-sequence")(mongoose);

const attractionTransactionSchema = new Schema(
    {
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        paymentProcessor: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["wallet", "ccavenue"],
        },
        processId: {
            type: String,
            required: true,
        },
        attractionId: {
            type: Schema.Types.ObjectId,
            ref: "Attraction",
            required: true,
        },
        attractionName: {
            type: String,
            required: true,
        },
        activityId: {
            type: Schema.Types.ObjectId,
            ref: "AttractionActivity",
            required: true,
        },
        activityName: {
            type: String,
            required: true,
        },
        dateTime: {
            type: Date,
            required: true,
        },
        description: {
            type: String,
        },
        debitAmount: {
            type: Number,
            required: true,
        },
        creditAmount: {
            type: Number,
            required: true,
        },

        closingBalance: {
            type: Number,
            required: true,
        },
        dueAmount: {
            type: Number,
            required: true,
        },
        profit: {
            type: Number,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        cost: {
            type: Number,
            required: true,
        },
        remark: {
            type: String,
        },
        description: {
            type: String,
        },
        attractionTransactionNo: {
            type: Number,
        },
        referenceNumber: {
            type: String,
            required: true,
        },
        admin: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
        },
    },
    { timestamps: true }
);

attractionTransactionSchema.plugin(AutoIncrement, {
    inc_field: "attractionTransactionNo",
    start_seq: 10000,
});

const AttractionTransaction = model("AttractionTransaction", attractionTransactionSchema);

module.exports = AttractionTransaction;
