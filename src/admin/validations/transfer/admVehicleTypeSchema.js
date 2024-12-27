const Joi = require("joi");

const admVehicleTypeSchema = Joi.object({
    name: Joi.string().required(),
    vehicleCategoryId: Joi.string().required(),
    normalOccupancy: Joi.number().required(),
    airportOccupancy: Joi.number().required(),
    image: Joi.string().allow("", null),
});

module.exports = { admVehicleTypeSchema };
