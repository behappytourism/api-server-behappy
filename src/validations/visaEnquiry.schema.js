const Joi = require("joi");

const visaEnquireySchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().required(),
    whatsapp: Joi.number().required(),
    nationality: Joi.string().required(),
    message: Joi.string().required(),
});

module.exports = { visaEnquireySchema };
