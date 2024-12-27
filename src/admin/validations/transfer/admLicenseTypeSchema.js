const Joi = require("joi");

const admLicenseTypeSchema = Joi.object({
    licenseType: Joi.string().required(),
});

module.exports = { admLicenseTypeSchema };
