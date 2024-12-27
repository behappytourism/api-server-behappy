const Joi = require("joi");

const b2bHotelClientMarkupSchema = Joi.object({
    markupType: Joi.string().valid("flat", "percentage").required(),
    markup: Joi.number().required(),
    roomTypeId: Joi.string().required(),
});

const b2bHotelSubAgentMarkupSchema = Joi.object({
    markupType: Joi.string().valid("flat", "percentage").required(),
    markup: Joi.number().required(),
    roomTypeId: Joi.string().required(),
    subAgentId: Joi.string().required(),
});

module.exports = { b2bHotelClientMarkupSchema, b2bHotelSubAgentMarkupSchema };
