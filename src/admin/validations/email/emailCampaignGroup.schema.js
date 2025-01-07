const Joi = require("joi");

const emailCampaignGroupSchema = Joi.object({
    name: Joi.string().required(),
    // startDate: Joi.string().required(),
    // endDate: Joi.string().required(),
});

module.exports = { emailCampaignGroupSchema };
