const Joi = require("joi");

const admVehicleTrimSchema = Joi.object({
    vehicleModel: Joi.string().required(),
    trimName: Joi.string().required(),
    airportSeatingCapacity: Joi.number().required(),
    normalSeatingCapacity: Joi.number().required(),
});

module.exports = { admVehicleTrimSchema };
