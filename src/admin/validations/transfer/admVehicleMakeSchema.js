const Joi = require("joi");

const admVehicleMakeSchema = Joi.object({
    companyName: Joi.string().required(),
});

module.exports = { admVehicleMakeSchema };
