const { Schema, model } = require("mongoose");

const b2bHotelPayLaterCronJobSchema = new Schema(
    {
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "reseller",
            required: true,
        },
        hotelOrder: {
            type: Schema.Types.ObjectId,
            ref: "B2BHotelOrder",
            required: true,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
        expiryDatePluOne: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

const B2BHotelPayLaterCronJob = model("B2BHotelPayLaterCronJob", b2bHotelPayLaterCronJobSchema);

module.exports = B2BHotelPayLaterCronJob;
