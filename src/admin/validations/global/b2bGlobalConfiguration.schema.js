const Joi = require("joi");

const upserB2bConfigurationsSchema = Joi.object({
    showContractHotels: Joi.boolean().required(),
    showHotelBedHotels: Joi.boolean().required(),
    showOttilaHotels: Joi.boolean().required(),
    showIolxHotels: Joi.boolean().required(),
    oldImages: Joi.array().items(Joi.string()),
});

module.exports = { upserB2bConfigurationsSchema };
