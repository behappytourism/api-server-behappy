const { Schema, model } = require("mongoose");

const b2bA2aOrderLogSchema = new Schema(
    {
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        a2aTicketId: { type: Schema.Types.ObjectId, ref: "B2BA2aTicket", required: true },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "B2BA2aOrder",
            required: true,
        },
        noOfTravellers: {
            type: Number,
        },
        ticketNoBefore: {
            type: Number,
        },
        ticketNoAfter: {
            type: Number,
        },
    },
    { timestamps: true }
);

const B2bA2aOrderLog = model("B2bA2aOrderLog", b2bA2aOrderLogSchema);

module.exports = B2bA2aOrderLog;
