const Joi = require("joi");

const b2bApiAttractionActivityPriceSchema = Joi.object({
    attractions: Joi.array().items(Joi.number()),
    destination: Joi.object({
        code: Joi.string().allow("", null),
    }),
    category: Joi.object({
        code: Joi.number().allow("", null),
    }),
});

const b2bApiAttractionSlotSchema = Joi.object({
    date: Joi.date().required(),
    activityId: Joi.string().required(),
});

module.exports = { b2bApiAttractionActivityPriceSchema, b2bApiAttractionSlotSchema };
