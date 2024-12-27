const Joi = require("joi");

const visaNationalitySchema = Joi.object({
    visaType: Joi.string().required(),
    selectedCountries: Joi.array().required(),
    adultCost: Joi.number().required(),
    childCost: Joi.number().required(),
    adultMarkupType: Joi.string().valid("flat", "percentage").required(),
    adultMarkup: Joi.number().required(),
    childMarkupType: Joi.string().valid("flat", "percentage").required(),
    childMarkup: Joi.number().required(),
});

const editVisaNationalitySchema = Joi.object({
    visaType: Joi.string().required(),
    nationality: Joi.string().required(),
    adultCost: Joi.number().required(),
    childCost: Joi.number().required(),
    adultMarkupType: Joi.string().valid("flat", "percentage").required(),
    adultMarkup: Joi.number().required(),
    childMarkupType: Joi.string().valid("flat", "percentage").required(),
    childMarkup: Joi.number().required(),
});

module.exports = { visaNationalitySchema, editVisaNationalitySchema };
