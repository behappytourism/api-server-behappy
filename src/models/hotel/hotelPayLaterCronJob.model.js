const { Schema, model } = require("mongoose");

const hotelPayLaterCronJobSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        hotelOrder: {
            type: Schema.Types.ObjectId,
            ref: "HotelOrder",
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

const HotelPayLaterCronJob = model("HotelPayLaterCronJob", hotelPayLaterCronJobSchema);

module.exports = HotelPayLaterCronJob;
