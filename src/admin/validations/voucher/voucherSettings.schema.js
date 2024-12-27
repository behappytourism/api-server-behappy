const Joi = require("joi");

const voucherSettingsSchema = Joi.object({
    termsAndCondition: Joi.string().required(),
});

module.exports = { voucherSettingsSchema };
