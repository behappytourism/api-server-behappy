const Joi = require("joi");

const citySchema = Joi.object({
    cityCode: Joi.string().required(),
    cityName: Joi.string().required(),
    country: Joi.string().required(),
    state: Joi.string().required(),
});

module.exports = { citySchema };
