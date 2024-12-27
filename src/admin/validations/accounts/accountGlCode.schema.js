const Joi = require("joi");

const accountGlCodeSchema = Joi.object({
    headId: Joi.string().required(),
    natureId: Joi.string().required(),
    name: Joi.string().required(),
    shortCode: Joi.string().required(),
});

module.exports = { accountGlCodeSchema };
