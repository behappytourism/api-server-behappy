const Joi = require("joi");

const admVehicleBodyTypeSchema = Joi.object({
    bodyType: Joi.string().required(),
});

module.exports = { admVehicleBodyTypeSchema };
