const Joi = require("joi");

const schema = Joi.object({
    boardName: Joi.string(),
    boardShortName: Joi.string(),
    subNames: Joi.array(),
});

const boardTypeSchema = schema.keys({
    subNames: Joi.array().when("$isForSubNames", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
    boardName: Joi.string().when("$isForSubNames", {
        is: false,
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
    boardName: Joi.string().when("$isForSubNames", {
        is: false,
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
});

module.exports = { boardTypeSchema };
