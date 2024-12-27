const Joi = require("joi");

const b2bHotelResellerSettingsSchema = Joi.object({
    resellerId: Joi.string().required(),
    availableHotels: Joi.array().items(Joi.string()),
    availableAreas: Joi.array().items(Joi.string()),
    availableCities: Joi.array().items(Joi.string()),
});

module.exports = { b2bHotelResellerSettingsSchema };
