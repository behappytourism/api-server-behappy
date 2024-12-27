const Joi = require("joi");

const admPromoCodeSchema = Joi.object({
    product: Joi.string().required(),
    type: Joi.string().required(),
    value: Joi.number().required(),
    isSpecific: Joi.boolean().required(),
    users: Joi.array().when("isSpecific", {
        is: true,
        then: Joi.array().required(),
    }),
    isValid: Joi.boolean().required(),
    fromValidity: Joi.when("isValid", {
        is: true,
        then: Joi.date().required(),
        otherwise: Joi.allow(null).optional(),
    }),
    toValidity: Joi.when("isValid", {
        is: true,
        then: Joi.date().required(),
        otherwise: Joi.allow(null).optional(),
    }),
    minPurchaseValue: Joi.number().required(),
    maxPromoDiscount: Joi.number().required(),
    useageCount: Joi.number().required(),
    useagePerPersonCount: Joi.number().required(),
    section: Joi.string().required(),
    code: Joi.string().required(),
});

module.exports = { admPromoCodeSchema };
