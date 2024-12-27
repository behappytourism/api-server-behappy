const Joi = require("joi");

module.exports = {
    transferAvailabilitySchema: Joi.object({
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
    }),
};
