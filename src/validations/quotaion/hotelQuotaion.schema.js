const Joi = require("joi");

const singleRoomTypeRateSchema = Joi.object({
    noOfAdults: Joi.number().required().min(1).precision(0),
    noOfChildren: Joi.number().required().precision(0).allow("", null),
    childrenAges: Joi.array().items(Joi.number()),
    checkInDate: Joi.date().required(),
    checkOutDate: Joi.date().required(),
    hotelId: Joi.string().required(),
    roomTypeId: Joi.string().required(),
    boardTypeCode: Joi.string().required(),
});

module.exports = { singleRoomTypeRateSchema };
