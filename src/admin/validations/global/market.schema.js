const Joi = require("joi");

const marketSchema = Joi.object({
    marketName: Joi.string().required(),
});

module.exports = { marketSchema };
