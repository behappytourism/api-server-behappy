const Joi = require("joi");

const admEmailConfigSchema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
    product: Joi.string().required(),
    actions: Joi.array().items(Joi.string().allow("approve", "cancel", "confirm", "order")),
    host: Joi.string().required(),
    port: Joi.number().required(),
    secure: Joi.boolean().required(),
    type: Joi.string().required(),
});

const admEmailReceiverConfigSchema = Joi.object({
    product: Joi.string().required(),
    actions: Joi.array().items(Joi.string().allow("approve", "cancel", "confirm", "order")),
    email: Joi.string().required(),
    type: Joi.string().required(),
});
module.exports = { admEmailConfigSchema, admEmailReceiverConfigSchema };
