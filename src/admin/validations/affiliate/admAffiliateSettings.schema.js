const Joi = require("joi");

const admAffiliateSettingsSchema = Joi.object({
    termsAndConditions: Joi.string().required(),
    policy: Joi.string().required(),
    pointValue: Joi.number().required(),
    redeemOptions: Joi.array().required(),
    deductionFee: Joi.number().required(),
});

module.exports = { admAffiliateSettingsSchema };
