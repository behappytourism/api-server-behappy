const Joi = require("joi");

const admResellerConfigurationSchema = Joi.object({
    showAttraction: Joi.boolean().required(),
    showInsurance: Joi.boolean().required(),
    showHotel: Joi.boolean().required(),
    showFlight: Joi.boolean().required(),
    showVisa: Joi.boolean().required(),
    showA2a: Joi.boolean().required(),
    showQuotaion: Joi.boolean().required(),
    allowedPaymentMethods: Joi.array().items(Joi.string().allow("wallet", "ccavenue", "pay-later")),

    // new api access configuration changes
    showAttractionApi: Joi.boolean().required(),
    showInsuranceApi: Joi.boolean().required(),
    showHotelApi: Joi.boolean().required(),
    showFlightApi: Joi.boolean().required(),
    showVisaApi: Joi.boolean().required(),
    showA2aApi: Joi.boolean().required(),
    showQuotaionApi: Joi.boolean().required(),
});

module.exports = { admResellerConfigurationSchema };
