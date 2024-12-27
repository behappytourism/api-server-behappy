const Joi = require("joi");

const admCompanyAddressSchema = Joi.object({
    location: Joi.string().required(),
    companyName: Joi.string().required(),
    country: Joi.string().required(),
    state: Joi.string().required(),
    address: Joi.string().required(),
    phoneNumber: Joi.string().required(),
});

module.exports = { admCompanyAddressSchema };
