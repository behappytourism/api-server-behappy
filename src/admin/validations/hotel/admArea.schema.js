const Joi = require("joi");

const admAreaSchema = Joi.object({
    areaCode: Joi.string().required(),
    areaName: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
});

module.exports = { admAreaSchema };
