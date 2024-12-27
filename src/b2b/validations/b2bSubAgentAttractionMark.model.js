const Joi = require("joi");

const b2bSubAgentAttractionMarkupSchema = Joi.object({
    markupType: Joi.string().valid("flat", "percentage").required(),
    markup: Joi.number().required(),
    activityId: Joi.string().required(),
    subAgentId: Joi.string().required(),
});

module.exports = { b2bSubAgentAttractionMarkupSchema };
