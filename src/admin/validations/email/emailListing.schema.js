const Joi = require("joi");

const emailListingSchema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string()
        .valid(...["manual", "custom"])
        .required(),
    filePath: Joi.string().allow("", null),
    recipientGroup: Joi.string().when("type", {
        is: Joi.string().valid("custom"),
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    products: Joi.array().when("recipientGroup", {
        is: Joi.string().valid("b2b"),
        then: Joi.array().valid().min(1),
    }),
    isCountries: Joi.boolean().required(),
    countries: Joi.array().when("isCountries", {
        is: Joi.boolean().valid(true),
        then: Joi.array().valid().min(1),
        // otherwise: Joi.string().allow("", null),
    }),
});

module.exports = { emailListingSchema };
