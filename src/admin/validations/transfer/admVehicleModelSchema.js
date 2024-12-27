const Joi = require("joi");

const admVehicleModelSchema = Joi.object({
    modelName: Joi.string().required(),
    vehicleMake: Joi.string().required(),
    bodyType: Joi.string().required(),
});

module.exports = { admVehicleModelSchema };
