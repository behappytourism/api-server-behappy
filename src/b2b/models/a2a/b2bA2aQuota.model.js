const { Schema, model } = require("mongoose");

const b2bA2aQuotaSchema = new Schema(
    {
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        ticketId: {
            type: Schema.Types.ObjectId,
            ref: "B2BA2aTicket",
            required: true,
        },
        ticketCountTotal: {
            type: Number,
            required: true,
        },
        ticketCountUsed: {
            type: Number,
            required: true,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const B2BA2aQuota = model("B2BA2aQuota", b2bA2aQuotaSchema);

module.exports = B2BA2aQuota;
