const Joi = require("joi");

const hotelAddonsSchema = Joi.object({
    hotel: Joi.string().required(),
    fromDate: Joi.date().required(),
    toDate: Joi.date().required(),
    roomTypes: Joi.array().items(Joi.string().required()).required().min(1),
    boardTypes: Joi.array().items(Joi.string().required()).required().min(1),
    addOnName: Joi.string().required(),
    applyOn: Joi.string().required().allow("pax", "room"),
    adultPrice: Joi.when("applyOn", {
        is: Joi.string().valid("pax"),
        then: Joi.number().required().min(0),
        otherwise: Joi.number().allow("", null),
    }),
    childPrice: Joi.when("applyOn", {
        is: Joi.string().valid("pax"),
        then: Joi.number().required().min(0),
        otherwise: Joi.number().allow("", null),
    }),
    infantPrice: Joi.when("applyOn", {
        is: Joi.string().valid("pax"),
        then: Joi.number().required().min(0),
        otherwise: Joi.number().allow("", null),
    }),
    roomPrice: Joi.when("applyOn", {
        is: Joi.string().valid("room"),
        then: Joi.number().required().min(0),
        otherwise: Joi.number().allow("", null),
    }),
    isMandatory: Joi.boolean().required(),
});

module.exports = { hotelAddonsSchema };
