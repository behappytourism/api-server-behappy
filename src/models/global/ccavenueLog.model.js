const { Schema, model } = require("mongoose");

const ccacenueLogSchema = new Schema(
    {
        paymentId: {
            type: String,
            required: true,
        },
        orderId: {
            type: String,
            required: true,
        },
        data: {},
    },
    { timestamps: true }
);

const CcavenueLog = model("CcavenueLog", ccacenueLogSchema);

module.exports = CcavenueLog;
