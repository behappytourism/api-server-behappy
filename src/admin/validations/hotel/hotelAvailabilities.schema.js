const Joi = require("joi");

const singleHotelAvailabilitySchema = Joi.object({
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
    nationality: Joi.string().allow("", null),
    hotelId: Joi.string().required(),
    resellerId: Joi.string().required(),
    priceType: Joi.string().allow("", null),
});

module.exports = {
    singleHotelAvailabilitySchema,
};
