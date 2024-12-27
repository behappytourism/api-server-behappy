const Joi = require("joi");

const admVehicleSchema = Joi.object({
    vehicleMake: Joi.string().required(),
    vehicleModel: Joi.string().required(),
    vehicleTrim: Joi.string().required(),
    vehicleCategory: Joi.string().required(),
    vehicleType: Joi.string().required(),
    year: Joi.number().required(),
    airportSeatingCapacity: Joi.number().required(),
    normalSeatingCapacity: Joi.number().required(),
    registrationNumber: Joi.string().allow("", null),
    registrationExpDate: Joi.date().allow("", null),
    insuranceNumber: Joi.string().allow("", null),
    insuranceExpDate: Joi.date().allow("", null),
    vinNumber: Joi.string().allow("", null),
    transmissionType: Joi.string().required().valid("automatic", "manual"),
    vehicleColor: Joi.string().allow("", null),
});

module.exports = { admVehicleSchema };
