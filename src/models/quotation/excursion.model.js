const { Schema, model } = require("mongoose");

const excursionSchema = new Schema(
    {
        activityId: {
            type: Schema.Types.ObjectId,
            ref: "AttractionActivity",
            required: true,
        },
        isQuotation: {
            type: Boolean,
            required: true,
            default: false,
        },
        isCarousel: {
            type: Boolean,
            required: true,
            default: false,
        },
        carouselPosition: {
            type: Number,
            required: function () {
                return this.isCarousel === true;
            },
        },
        excursionType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["ticket", "transfer"],
        },
        ticketPricing: {
            type: Schema.Types.ObjectId,
            ref: "ExcursionTicketPricing",
            // required: function () {
            //     return this.excursionType === "ticket";
            // },
        },
        transferPricing: {
            type: Schema.Types.ObjectId,
            ref: "ExcursionTransferPricing",
            // required: function () {
            //     return this.excursionType === "transfer";
            // },
        },
    },
    { timestamps: true }
);

const Excursion = model("Excursion", excursionSchema);

module.exports = Excursion;
