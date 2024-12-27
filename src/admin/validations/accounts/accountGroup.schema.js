const Joi = require("joi");

const accountGroupSchema = Joi.object({
    name: Joi.string().required(),
});

module.exports = { accountGroupSchema };
