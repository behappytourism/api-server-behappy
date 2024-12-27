const Joi = require("joi");

const b2bConfigurationsSchema = Joi.object({
    subAgentId: Joi.string().required(),
    showAttraction: Joi.boolean().allow("", null),
    showInsurance: Joi.boolean().allow("", null),
    showHotel: Joi.boolean().allow("", null),
    showFlight: Joi.boolean().allow("", null),
    showVisa: Joi.boolean().allow("", null),
    showA2a: Joi.boolean().allow("", null),
    showQuotaion: Joi.boolean().allow("", null),
});

module.exports = { b2bConfigurationsSchema };
