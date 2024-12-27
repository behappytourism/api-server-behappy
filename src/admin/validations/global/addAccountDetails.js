const Joi = require("joi");

const accountDetailsSchema = Joi.object({
    accountName: Joi.string().required(),
    date: Joi.date().required(),
    openingBalance: Joi.number().required(),
    description: Joi.string().allow("", null),
    accountNumber: Joi.number().required(),
    currency: Joi.string().required(),
});

module.exports = { accountDetailsSchema };
