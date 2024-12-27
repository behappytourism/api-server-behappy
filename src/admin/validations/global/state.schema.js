const Joi = require("joi");

const stateSchema = Joi.object({
    stateName: Joi.string().required(),
    country: Joi.string().required(),
    stateCode: Joi.string().required(),
});

module.exports = { stateSchema };
