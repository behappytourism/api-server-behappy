const { Schema, model } = require("mongoose");

const attractionTicketLogSchema = new Schema(
    {
        attraction: {
            type: Schema.Types.ObjectId,
            ref: "Attraction",
            required: true,
        },
        attractionName: {
            type: String,
        },
        activity: {
            type: Schema.Types.ObjectId,
            ref: "AttractionActivity",
            required: true,
        },
        activityName: {
            type: String,
        },
        ticketNumber: {
            type: String,
            required: true,
        },
        admin: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
        },
        adminName: {
            type: String,
        },
        ipaddress: {
            type: String,
        },
        loggedFrom: {
            type: String,
            enum: ["tickets-list", "tickets-list-used", "orders-list"],
        },
    },
    { timestamps: true }
);

const AttractionTicketLog = model("AttractionTicketLog", attractionTicketLogSchema);

module.exports = AttractionTicketLog;
