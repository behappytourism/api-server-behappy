const Joi = require("joi");

const availabilitySearchSchema = Joi.object({
    noOfAdults: Joi.number().required().min(1),
    noOfChildren: Joi.number().required(),
    noOfInfants: Joi.number().required(),
    type: Joi.string().required().valid("oneway", "return", "multicity"),
    from: Joi.when("type", {
        is: ["return", "oneway"],
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    to: Joi.when("type", {
        is: ["return", "oneway"],
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    departureDate: Joi.when("type", {
        is: ["return", "oneway"],
        then: Joi.date().required(),
        otherwise: Joi.string().allow("", null),
    }),
    returnDate: Joi.when("type", {
        is: "return",
        then: Joi.date().required(),
        otherwise: Joi.string().allow("", null),
    }),
    airItineraries: Joi.when("type", {
        is: "multicity",
        then: Joi.array()
            .items({
                from: Joi.string().required(),
                to: Joi.string().required(),
                departureDate: Joi.date().required(),
            })
            .min(2),
        otherwise: Joi.array().allow("", null),
    }),
});

const sellTripSchema = Joi.object({
    noOfAdults: Joi.number().required().min(1),
    noOfChildren: Joi.number().required(),
    noOfInfants: Joi.number().required(),
    type: Joi.string().required().valid("oneway", "return", "multicity"),
    trips: Joi.array().items({
        key: Joi.string().required(),
    }),
});

const singleFlightDetailsSchema = Joi.object({
    noOfAdults: Joi.number().required().min(1),
    noOfChildren: Joi.number().required(),
    noOfInfants: Joi.number().required(),
    type: Joi.string().required().valid("oneway", "return", "multicity"),
    trips: Joi.array()
        .items({
            flightSegments: Joi.array()
                .items({
                    from: Joi.string().required(),
                    to: Joi.string().required(),
                    arrivalDate: Joi.date().required(),
                    departureDate: Joi.date().required(),
                    flightNumber: Joi.string().required(),
                    rph: Joi.string().required(),
                })
                .min(1),
        })
        .min(1),
    bundledServiceId: Joi.string().allow("", null),
});

const priceQuoteWithAncillarySchema = Joi.object({
    noOfAdults: Joi.number().required().min(1),
    noOfChildren: Joi.number().required(),
    noOfInfants: Joi.number().required(),
    type: Joi.string().required().valid("oneway", "return", "multicity"),
    trips: Joi.array()
        .items({
            flightSegments: Joi.array()
                .items({
                    from: Joi.string().required(),
                    to: Joi.string().required(),
                    arrivalDate: Joi.date().required(),
                    departureDate: Joi.date().required(),
                    flightNumber: Joi.string().required(),
                    rph: Joi.string().required(),
                    baggageCode: Joi.string().allow("", null),
                    mealCode: Joi.string().allow("", null),
                    seatNumber: Joi.string().allow("", null),
                })
                .min(1),
        })
        .min(1),
    bundledServiceId: Joi.string().allow("", null),
});

const bookFlightSchema = Joi.object({
    type: Joi.string().required().valid("oneway", "return", "multicity"),
    trips: Joi.array()
        .items({
            flightSegments: Joi.array()
                .items({
                    from: Joi.string().required(),
                    to: Joi.string().required(),
                    arrivalDate: Joi.date().required(),
                    departureDate: Joi.date().required(),
                    flightNumber: Joi.string().required(),
                    rph: Joi.string().required(),
                })
                .min(1),
        })
        .min(1),
    travellers: Joi.array().items({
        nameTitle: Joi.string().required().valid("MR", "MRS", "MS"),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        birthDate: Joi.date().required(),
        passengerType: Joi.string().required().valid("ADT", "CHD", "INF"),
        countryCode: Joi.string().required(),
        phoneCode: Joi.number().required(),
        phoneNumber: Joi.number().required(),
        cityCode: Joi.number().required(),
        nationality: Joi.string().required(),
    }),
    contactInfo: Joi.object({
        nameTitle: Joi.string().required().valid("MR", "MRS", "MS"),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        phoneCode: Joi.number().required(),
        areaCode: Joi.number().required(),
        email: Joi.string().email().required(),
        countryName: Joi.string().required(),
        countryCode: Joi.string().required(),
        cityName: Joi.string().required(),
    }),
    identifierToken: Joi.string().required(),
    amount: Joi.number().required(),
});

module.exports = {
    availabilitySearchSchema,
    sellTripSchema,
    singleFlightDetailsSchema,
    priceQuoteWithAncillarySchema,
    bookFlightSchema,
};
