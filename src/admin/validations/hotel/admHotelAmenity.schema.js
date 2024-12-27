const Joi = require("joi");

const hotelAmenityGroupSchema = Joi.object({
    name: Joi.string().required(),
    iconUrl: Joi.string().allow("", null),
    icon: Joi.string().allow("", null),
});

const hotelAmenitySchema = Joi.object({
    name: Joi.string().required(),
    parent: Joi.string().required(),
    iconUrl: Joi.string().allow("", null),
    icon: Joi.string().allow("", null),
});

module.exports = { hotelAmenityGroupSchema, hotelAmenitySchema };
