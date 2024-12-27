const Joi = require("joi");

const invoiceSettingsSchema = Joi.object({
    companyName: Joi.string().required(),
    emails: Joi.array().items(Joi.string().email().required()).min(1),
    phoneNumber: Joi.string().required(),
    address: Joi.string().required(),
    showTermsAndConditions: Joi.boolean().required(),
    termsAndConditions: Joi.string().allow("", null),
    showBankDetails: Joi.boolean().required(),
    bankAccounts: Joi.array().items(Joi.string()),
    logo: Joi.string().allow("", null),
});

module.exports = { invoiceSettingsSchema };
