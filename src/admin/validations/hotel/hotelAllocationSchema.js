const Joi = require("joi");

const hotelAllocationSchema = Joi.object({
    hotelId: Joi.string().required(),
    fromDate: Joi.date().required(),
    toDate: Joi.date().required(),
    roomTypes: Joi.array().items(Joi.string().required()).required().min(1),
    contractGroups: Joi.array().items(Joi.string().required()).required().min(1),
    allocationType: Joi.string().required().allow("free-sale", "stop-sale", "static", "on-request"),
    releaseDate: Joi.when("allocationType", {
        is: Joi.string().valid("free-sale", "static"),
        then: Joi.number().required(),
        otherwise: Joi.number().allow("", null),
    }),
    unitWise: Joi.when("allocationType", {
        is: Joi.string().valid("static"),
        then: Joi.string().required().allow("pax", "room"),
        otherwise: Joi.string().allow("", null),
    }),
    allocation: Joi.when("allocationType", {
        is: Joi.string().valid("static"),
        then: Joi.number().required(),
        otherwise: Joi.number().allow("", null),
    }),
    rateType: Joi.string().required().valid("all-promotions", "contract-rate", "default"),
});

const allocationAvailabilitySchema = Joi.object({
    fromDate: Joi.date().required(),
    toDate: Joi.date().required(),
    hotelId: Joi.string().required(),
    contractGroups: Joi.array().items(Joi.string().required()).min(1),
});

module.exports = { hotelAllocationSchema, allocationAvailabilitySchema };
