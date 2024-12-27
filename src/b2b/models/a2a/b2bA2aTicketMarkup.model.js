const { Schema, model } = require("mongoose");

const b2bA2aTicketMarkupSchema = new Schema(
    {
        markupType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["flat", "percentage"],
        },
        markup: {
            type: Number,
            required: true,
        },
        a2aTicketId: {
            type: Schema.Types.ObjectId,
            ref: "B2BA2aTicket",
            required: true,
        },
    },
    { timestamps: true }
);

const B2BA2aTicketMarkup = model("B2BA2aTicketMarkup", b2bA2aTicketMarkupSchema);

module.exports = B2BA2aTicketMarkup;
