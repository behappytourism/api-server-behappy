const Joi = require("joi")

const b2cOrderSchema = Joi.object({
    // referenceNumber: Joi.string().required(),
    name: Joi.string().required(),
    phoneNumber: Joi.number().required(),
    country: Joi.string().required(),
    email: Joi.string().email().required(),
    countryCode: Joi.string().required(),
    selectedJourneys: Joi.array().items({
        transferType: Joi.string().required().allow("oneway", "return"),
        pickupLocation: Joi.string().required(),
        dropOffLocation: Joi.string().required(),
        dropOffSuggestionType: Joi.string().required(),
        pickupSuggestionType: Joi.string().required(),
        pickupDate: Joi.date().required(),
        pickupTime: Joi.string().required(),
        returnDate: Joi.when("transferType", {
            is: Joi.string().valid("return"),
            then: Joi.date().required(),
            otherwise: Joi.date().allow("", null),
        }),
        returnTime: Joi.when("transferType", {
            is: Joi.string().valid("return"),
            then: Joi.string().required(),
            otherwise: Joi.string().allow("", null),
        }),
        noOfAdults: Joi.number().required(),
        noOfChildrens: Joi.number().required(),
        selectedVehicleTypes: Joi.array()
            .min(1)
            .required()
            .items({
                vehicle: Joi.string().required(),
                count: Joi.number().required().min(1).precision(0),
            }),
        selectedReturnVehicleTypes: Joi.when("transferType", {
            is: Joi.string().valid("return"),
            then: Joi.array()
                .min(1)
                .required()
                .items({
                    vehicle: Joi.string().required(),
                    count: Joi.number().required().min(1).precision(0),
                }),
            otherwise: Joi.array().allow("", null),
        }),
    }),
    selectedActivities: Joi.array().items({
        activity: Joi.string().required(),
        date: Joi.date().required(),
        adultsCount: Joi.number().required().min(1).precision(0),
        childrenCount: Joi.number().required().min(0).precision(0),
        infantCount: Joi.number().required().min(0).precision(0),
        hoursCount: Joi.number().allow("", null).min(1).precision(0),
        transferType: Joi.string().valid("without", "shared", "private").required(),
        slot: Joi.object({
            EventID: Joi.string().allow("", null),
            EventName: Joi.string().allow("", null),
            StartDateTime: Joi.string().isoDate().allow("", null),
            EndDateTime: Joi.string().isoDate().allow("", null),
            ResourceID: Joi.string().allow("", null),
            Status: Joi.string().allow("", null),
            AdultPrice: Joi.number().allow("", null),
            ChildPrice: Joi.number().allow("", null),
            Available: Joi.string().allow("", null),
        }).allow(null),
        isPromoAdded: Joi.boolean().allow("", null),
    }),
    paymentMethod: Joi.string().required().allow("ccavenue"),
});

module.exports = { b2cOrderSchema }