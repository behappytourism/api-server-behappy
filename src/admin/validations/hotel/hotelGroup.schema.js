const Joi = require("joi");

const hotelGroupSchema = Joi.object({
    groupName: Joi.string().required(),
    groupCode: Joi.string().required(),
});

module.exports = { hotelGroupSchema };
