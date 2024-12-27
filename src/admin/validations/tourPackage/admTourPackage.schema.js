const Joi = require("joi");

const admTourPackageSchema = Joi.object({
    packageType: Joi.string().required().allow("static", "dynamic"),
    packageName: Joi.string().required(),
    overveiw: Joi.string().required(),
    packageThemes: Joi.array().items(Joi.string().required()).min(1),
    noOfDays: Joi.number().required().min(0).precision(0),
    isCustomDate: Joi.boolean().required(),
    availableDates: Joi.array()
        .items({
            fromDate: Joi.date().required(),
            toDate: Joi.date().required(),
        })
        .required(),
    excludedDates: Joi.array()
        .items({
            fromDate: Joi.date().required(),
            toDate: Joi.date().required(),
        })
        .required(),
    country: Joi.string().required(),
    destination: Joi.string().required(),
    itineraries: Joi.array().items({
        title: Joi.string().required(),
        itineraryItems: Joi.array().items({
            attractionId: Joi.string().required(),
            activityId: Joi.string().required(),
            transferType: Joi.string().required(),
            itineraryName: Joi.string().required(),
            description: Joi.string().required(),
            price: Joi.number().required().min(0),
        }),
    }),
    hotels: Joi.array().items({
        country: Joi.string().required(),
        city: Joi.string().required(),
        title: Joi.string().required(),
        noOfNights: Joi.number().required().min(1).precision(0),
        hotelOptions: Joi.array()
            .items({
                hotelId: Joi.string().required(),
                roomTypeId: Joi.string().required(),
                boardCode: Joi.string().required(),
                price: Joi.number().allow("", null),
            })
            .required(),
        price: Joi.number().allow("", null),
    }),
    isAirportTransfer: Joi.boolean().required(),
    airportTransferPrice: Joi.when("isAirportTransfer", {
        is: Joi.boolean().valid(true),
        then: Joi.number().required().min(0),
        otherwise: Joi.number().allow("", null),
    }),
    isInterHotelTransfer: Joi.boolean().required(),
    interHotelPrice: Joi.when("isInterHotelTransfer", {
        is: Joi.boolean().valid(true),
        then: Joi.number().required().min(0),
        otherwise: Joi.number().allow("", null),
    }),
    oldImages: Joi.array(),
    inclusions: Joi.string().required(),
    exclusions: Joi.string().required(),
    // cancellationPolicy: Joi.string().required(),
    visaPolicy: Joi.string().allow("", null),
    termsAndConditions: Joi.string().required(),
});

module.exports = { admTourPackageSchema };
