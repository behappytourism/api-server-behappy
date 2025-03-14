const Joi = require("joi");

const destinationSchema = Joi.object({
    code: Joi.string().required(),
    country: Joi.string().required(),
    name: Joi.string().required(),
});

module.exports = { destinationSchema };
