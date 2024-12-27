const Joi = require("joi");

const b2bVisaEnquireySchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().required(),
    whatsapp: Joi.number().required(),
    nationality: Joi.string().required(),
});

module.exports = { b2bVisaEnquireySchema };
