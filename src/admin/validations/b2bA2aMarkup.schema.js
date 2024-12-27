const Joi = require("joi");

const b2bA2aMarkupSchema = Joi.object({
    markupType: Joi.string().valid("flat", "percentage").required(),
    markup: Joi.number().required(),
    a2aTicketId: Joi.string().required(),
});

module.exports = { b2bA2aMarkupSchema };