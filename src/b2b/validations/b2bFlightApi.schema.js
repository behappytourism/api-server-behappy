const Joi = require("joi");

const availabilitySearchSchema = Joi.object({
    noOfAdults: Joi.number().required().min(1).precision(1),
    noOfChildren: Joi.number().required().min(0).precision(1),
    noOfInfants: Joi.number().required().min(0).precision(1),
    type: Joi.string().required().valid("oneway", "return", "multicity"),
    trips: Joi.array()
        .items({
            from: Joi.string().required(),
            to: Joi.string().required(),
            departureDate: Joi.date().required(),
            returnDate: Joi.date().allow("", null),
        })
        .min(1)
        .required(),
    travelClass: Joi.string().required().allow("economy", "business"),
});

const addToCartSchema = Joi.object({
    searchId: Joi.string().required(),
    fsrId: Joi.string().required(),
    selectedFareKey: Joi.string().allow("", null),
});

const singleFlightDetailsWithAncillarySchema = Joi.object({
    noOfAdults: Joi.number().required().min(1),
    noOfChildren: Joi.number().required(),
    noOfInfants: Joi.number().required(),
    type: Joi.string().required().valid("oneway", "return", "multicity"),
    trips: Joi.array()
        .items({
            flightSegments: Joi.array()
                .items({
                    key: Joi.string().required(),
                    from: Joi.string().required(),
                    to: Joi.string().required(),
                    arrivalDate: Joi.date().required(),
                    departureDate: Joi.date().required(),
                    flightNumber: Joi.string().required(),
                    fromTerminal: Joi.string().required(),
                    toTerminal: Joi.string().required(),
                })
                .min(1),
            fareKey: Joi.string().allow(""),
        })
        .min(1),
    identifierToken: Joi.string().required(),
});

const addFlightAncillarySchema = Joi.object({
    tbId: Joi.string().required(),
    ancillaries: Joi.array()
        .items({
            journeyOriginDestinationInfo: Joi.object({
                from: Joi.string().required(),
                to: Joi.string().required(),
            }).required(),
            userSelectedBaggageAncillaries: Joi.array()
                .items({
                    journeyKey: Joi.string().required(),
                    baggageDetails: Joi.array()
                        .items({
                            baggageCode: Joi.string().required(),
                            baggageInfo: Joi.string().required(),
                            paxId: Joi.string().required(),
                        })
                        .required(),
                })
                .required(),
            userSelectedMealAncillaries: Joi.array()
                .items({
                    segmentKey: Joi.string().required(),
                    mealDetails: Joi.array()
                        .items({
                            mealCode: Joi.string().required(),
                            mealInfo: Joi.string().required(),
                            paxId: Joi.string().required(),
                        })
                        .required(),
                })
                .required(),
            userSelectedSeatAncillaries: Joi.array()
                .items({
                    segmentKey: Joi.string().required(),
                    seatDetails: Joi.array()
                        .items({
                            seatCode: Joi.string().required(),
                            seatNumber: Joi.string().required(),
                            paxId: Joi.string().required(),
                        })
                        .required(),
                })
                .required(),
        })
        .required(),
});

const inititateFlightBookingSchema = Joi.object({
    tbId: Joi.string().required(),
    passengerDetails: Joi.array()
        .items({
            paxId: Joi.string().required(),
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            birthDate: Joi.date().required(),
            passengerType: Joi.string().required().valid("ADT", "CHD", "INF"),
            gender: Joi.string().required(),
            nationality: Joi.string().required(),
            passportNumber: Joi.string().allow("", null),
            passportExpiry: Joi.date().allow("", null),
        })
        .required()
        .min(1),
    contactDetails: Joi.object({
        email: Joi.string().email().required(),
        phoneCode: Joi.number().required(),
        phoneNumber: Joi.number().required(),
    }).required(),
});

const completeBookingSchema = Joi.object({
    otp: Joi.number().required(),
    orderId: Joi.string().required(),
});

const fareByDatesSchema = Joi.object({
    origin: Joi.string().required(),
    destination: Joi.string().required(),
    travelClass: Joi.string().required().valid("economy", "business"),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    type: Joi.string().required().valid("oneway", "return"),
    outBoundDate: Joi.when("type", {
        is: Joi.string().valid("return"),
        then: Joi.date().required(),
        otherwise: Joi.date().allow("", null),
    }),
});

module.exports = {
    availabilitySearchSchema,
    addFlightAncillarySchema,
    completeBookingSchema,
    singleFlightDetailsWithAncillarySchema,
    inititateFlightBookingSchema,
    addToCartSchema,
    fareByDatesSchema,
};
