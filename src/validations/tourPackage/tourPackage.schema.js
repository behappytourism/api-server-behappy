const Joi = require("joi");

const tourPackageSchema = Joi.object({
    tourPackageId: Joi.string().required(),
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    countryCode: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    fromDate: Joi.date().required(),
    adultCount: Joi.number().required(),
    childrenCount: Joi.number().required(),
    isFlightBooked: Joi.boolean().required(),
    remarks: Joi.string().allow("", null),
});

module.exports = { tourPackageSchema };
