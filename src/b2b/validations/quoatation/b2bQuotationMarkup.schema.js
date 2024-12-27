const Joi = require("joi");

const b2bClientQuotationMarkupSchema = Joi.object({
    landmarkMarkupType: Joi.string().valid("flat", "percentage").required(),
    landmarkMarkup: Joi.number().required(),
    hotelMarkupType: Joi.string().valid("flat", "percentage").required(),
    hotelMarkup: Joi.number().required(),
    visaMarkupType: Joi.string().valid("flat", "percentage").required(),
    visaMarkup: Joi.number().required(),
});

const b2bSubAgentQuotationMarkupSchema = Joi.object({
    landmarkMarkupType: Joi.string().valid("flat", "percentage").required(),
    landmarkMarkup: Joi.number().required(),
    hotelMarkupType: Joi.string().valid("flat", "percentage").required(),
    hotelMarkup: Joi.number().required(),
    visaMarkupType: Joi.string().valid("flat", "percentage").required(),
    visaMarkup: Joi.number().required(),
});

module.exports = { b2bClientQuotationMarkupSchema, b2bSubAgentQuotationMarkupSchema };
