const Joi = require("joi");

const EmailTemplateingSchema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string()
        .valid(...["manual", "custom"])
        .required(),
    html: Joi.string().allow("", null),
    filePath: Joi.string().allow("", null),
    tags: Joi.array(),
});

module.exports = { EmailTemplateingSchema };
