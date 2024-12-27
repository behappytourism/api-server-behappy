const Joi = require("joi");

const addA2aSchema = Joi.object({
    airportFrom: Joi.string().required(),
    airportTo: Joi.string().required(),
    markupUpdate: Joi.array().items(
        Joi.object({
            profileId: Joi.string().required(),
            markup: Joi.number().required(),
            markupType: Joi.string().required(),
        })
    ),
});

module.exports = { addA2aSchema };
