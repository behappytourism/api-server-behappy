const Joi = require("joi");

const admDriverSchema = Joi.object({
    driverName: Joi.string().required(),
    nationality: Joi.string().required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().required(),
    whatsappNumber: Joi.string().required(),
    licenseNumber: Joi.string().required(),
    licenseExpDate: Joi.date().required(),
    availLicenseTypes: Joi.array().items(Joi.string()),
});

module.exports = { admDriverSchema };
