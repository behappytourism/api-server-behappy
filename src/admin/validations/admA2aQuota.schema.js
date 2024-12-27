const Joi = require("joi");

const addA2aQuotaSchema = Joi.object({
    resellerId: Joi.string().required(),
    ticketCount: Joi.number().required(),
});

module.exports = { addA2aQuotaSchema };
