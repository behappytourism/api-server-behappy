const Joi = require("joi");

const accountNatureSchema = Joi.object({
    name: Joi.string().required(),
    shortCode: Joi.string().required(),
});

module.exports = { accountNatureSchema };
