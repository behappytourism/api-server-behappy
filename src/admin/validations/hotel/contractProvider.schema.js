const Joi = require("joi");

const contractProviderSchema = Joi.object({
    providerName: Joi.string().required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().allow("", null),
});

module.exports = { contractProviderSchema };
