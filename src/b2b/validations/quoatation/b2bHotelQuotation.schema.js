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
    isTourismFeeIncluded: Joi.boolean().required(),
});

const qtnHotelAvailabilitySchema = Joi.object({
    searchQuery: Joi.object({
        id: Joi.string().required(),
        suggestionType: Joi.string().required(),
    }).required(),
    fromDate: Joi.date().required(),
    toDate: Joi.date().required(),
    rooms: Joi.array()
        .items({
            noOfAdults: Joi.number().required().min(1).precision(0),
            noOfChildren: Joi.number().required().min(0).precision(0),
            childrenAges: Joi.array().items(Joi.number().min(0).precision(0)).required(),
        })
        .required()
        .min(1),
});

module.exports = { singleRoomTypeRateSchema, qtnHotelAvailabilitySchema };
