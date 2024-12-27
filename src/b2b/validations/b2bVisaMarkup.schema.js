const Joi = require("joi");

const b2bClientVisaMarkupSchema = Joi.object({
    markupType: Joi.string().valid("flat", "percentage").required(),
    markup: Joi.number().required(),
    visaType: Joi.string().required(),
});

const b2bSubAgentVisaMarkupSchema = Joi.object({
    markupType: Joi.string().valid("flat", "percentage").required(),
    markup: Joi.number().required(),
    visaType: Joi.string().required(),
    subAgentId: Joi.string().required(),
});

module.exports = { b2bClientVisaMarkupSchema, b2bSubAgentVisaMarkupSchema };
