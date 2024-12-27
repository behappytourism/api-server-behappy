const Joi = require("joi");

const accommodationTypeSchema = Joi.object({
    accommodationTypeName: Joi.string().required(),
    accommodationTypeCode: Joi.string().required(),
});

module.exports = { accommodationTypeSchema };
