const Joi = require("joi");

const notificationSchema = Joi.object({
    title: Joi.string().required(),
    body: Joi.string().required(),
    page: Joi.string().required(),
    image: Joi.string().allow("", null),
    slug: Joi.string().required(),
});

module.exports = { notificationSchema };
