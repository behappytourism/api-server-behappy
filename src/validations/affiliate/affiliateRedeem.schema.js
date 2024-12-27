const Joi = require("joi");

const affiliateRedeemSchema = Joi.object({
    selectedId: Joi.string().required(),
    currency: Joi.string().required(),
    points: Joi.number().required(),
});

module.exports = { affiliateRedeemSchema };
