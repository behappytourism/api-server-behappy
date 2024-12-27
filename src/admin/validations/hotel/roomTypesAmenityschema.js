const Joi = require("joi");

const roomTypeAmenitySchema = Joi.object({
    name: Joi.string().required(),
});

module.exports = { roomTypeAmenitySchema };
