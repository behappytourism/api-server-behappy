const Joi = require("joi");

const b2bHotelRequestSchema = Joi.object({
    searchId: Joi.string().required(),
    hotelId: Joi.string().required(),
    rateKey: Joi.string().required(),
});

module.exports = { b2bHotelRequestSchema };
