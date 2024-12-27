const Joi = require("joi");

const resellerStatusUpdateSchema = Joi.object({
    status: Joi.string().allow("cancelled", "ok", "disabled"),
    formData: Joi.object({
        profileId: Joi.string().required(),
    }),
});

const resellerUpdateSchema = Joi.object({
    companyName: Joi.string().required(),
    address: Joi.string().required(),
    website: Joi.string().required(),
    country: Joi.string().required(),
    city: Joi.string().required(),
    zipCode: Joi.number().allow("", null),
    designation: Joi.string().required(),
    name: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    email: Joi.string().required(),
    skypeId: Joi.string().allow("", null),
    whatsappNumber: Joi.string().required(),
    password: Joi.string().allow("", null),
    trnNumber: Joi.string().allow("", null),
    companyRegistration: Joi.string().allow("", null),
    telephoneNumber: Joi.string().allow("", null),
    status: Joi.string().required().allow("pending", "ok", "cancelled", "disabled"),
    shortName: Joi.string().allow("", null),
});

const resellerAddSchema = Joi.object({
    companyName: Joi.string().required(),
    address: Joi.string().required(),
    website: Joi.string().required(),
    country: Joi.string().required(),
    city: Joi.string().required(),
    zipCode: Joi.number().allow("", null),
    designation: Joi.string().required(),
    name: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    email: Joi.string().required(),
    skypeId: Joi.string().allow("", null),
    whatsappNumber: Joi.string().required(),
    trnNumber: Joi.string().allow("", null),
    companyRegistration: Joi.string().allow("", null),
    telephoneNumber: Joi.string().allow("", null),
    status: Joi.string().required().allow("pending", "ok", "cancelled", "disabled"),
});

const subAgentAddSchema = Joi.object({
    companyName: Joi.string().required(),
    address: Joi.string().required(),
    website: Joi.string().required(),
    country: Joi.string().required(),
    city: Joi.string().required(),
    zipCode: Joi.number().allow("", null),
    designation: Joi.string().required(),
    name: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    email: Joi.string().required(),
    skypeId: Joi.string().allow("", null),
    whatsappNumber: Joi.string().required(),
    trnNumber: Joi.string().allow("", null),
    companyRegistration: Joi.string().allow("", null),
    telephoneNumber: Joi.string().allow("", null),
    status: Joi.string().required().allow("pending", "ok", "cancelled", "disabled"),
    referredBy: Joi.string().required(),
});

module.exports = {
    resellerStatusUpdateSchema,
    resellerUpdateSchema,
    resellerAddSchema,
    subAgentAddSchema,
};
