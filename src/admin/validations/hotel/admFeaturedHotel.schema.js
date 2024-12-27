const Joi = require("joi");

const admFeaturedHotelSchema = Joi.object({
    hotelId: Joi.string().required(),
    tagLine: Joi.string().allow("", null),
    showHomePage: Joi.boolean().required(),
    priority: Joi.number().allow("", null),
});

module.exports = { admFeaturedHotelSchema };
