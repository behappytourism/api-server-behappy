const Joi = require("joi");

const b2cAttractionMarkupSchema = Joi.object({
    adultMarkupType: Joi.string().valid("flat", "percentage").required(),
    adultMarkup: Joi.number().required(),
    childMarkupType: Joi.string().valid("flat", "percentage").required(),
    childMarkup: Joi.number().required(),
    infantMarkupType: Joi.string().valid("flat", "percentage").required(),
    infantMarkup: Joi.number().required(),
    activityId: Joi.string().required(),
});

module.exports = { b2cAttractionMarkupSchema };
