const Joi = require("joi");

const admHotelBannerAdSchema = Joi.object({
    hotelId: Joi.string().required(),
    priority: Joi.number().allow("", null),
});

module.exports = { admHotelBannerAdSchema };
