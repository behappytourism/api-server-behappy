const { Schema, model } = require("mongoose");

const ccavenueLogSchema = new Schema(
    {
        processName: { type: String },
        stepNumber: { type: Number },
        stepName: { type: String },
        comment: { type: String },
        redirectionUrl: { type: String },
        request: {},
        response: {},
        amount: { type: Number },
        orderType: { type: String },
        orderId: { type: String },
    },
    { timestamps: true }
);

const CcavenueLog = model("CcavenueLog", ccavenueLogSchema);

module.exports = CcavenueLog;
