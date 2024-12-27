const Joi = require("joi");

const vehicleTypeSchema = Joi.object({
    typeName: Joi.string().required(),
    maximumCapacity: Joi.number().required().min(1).precision(0),
    isAirportTransferAvailable: Joi.boolean().required(),
    airportTransferMaxCapacity: Joi.when('isAirportTransferAvailable', {
        is: Joi.boolean().valid(true),
        then: Joi.number().required().min(1).precision(0),
        otherwise: Joi.number().allow("", null)
    }),
    details: Joi.string().required(),
    vehicleCategory: Joi.string().required(),
});

module.exports = { vehicleTypeSchema };
