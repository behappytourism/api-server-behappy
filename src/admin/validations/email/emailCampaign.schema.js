const Joi = require("joi");

const emailCampaignSchema = Joi.object({
    name: Joi.string().required(),
    date: Joi.string().required(),
    hour: Joi.number().required(),
    min: Joi.number().required(),
    emailTemplateId: Joi.string().required(),
    emailListId: Joi.array().min(1).required(),
    subject: Joi.string().required(),
    tags: Joi.array(),
    campaignGroupId: Joi.string().required(),
    emailConfigId: Joi.string().required(),
    emailFooterId: Joi.string().required(),
});

const emailCampaginTestSchema = Joi.object({
    emails: Joi.array().min(1).required(),
    tags: Joi.array(),
    emailTemplateId: Joi.string().required(),
    subject: Joi.string().required(),
    emailConfigId: Joi.string().required(),
    emailFooterId: Joi.string().required(),
});

const emailCampaginPreviewSchema = Joi.object({
    // name: Joi.string().required(),
    // date: Joi.string().required(),
    // hour: Joi.number().required(),
    // min: Joi.number().required(),
    emailListId: Joi.array().min(1).required(),
    emailTemplateId: Joi.string().required(),
    // subject: Joi.string().required(),
    emailConfigId: Joi.string().required(),
    emailFooterId: Joi.string().required(),
});

module.exports = { emailCampaignSchema, emailCampaginTestSchema, emailCampaginPreviewSchema };
