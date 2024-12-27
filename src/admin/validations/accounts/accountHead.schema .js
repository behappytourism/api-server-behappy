const Joi = require("joi");

const accountHeadSchema = Joi.object({
    name: Joi.string().required(),
    shortCode: Joi.string().required(),
});

module.exports = { accountHeadSchema };
