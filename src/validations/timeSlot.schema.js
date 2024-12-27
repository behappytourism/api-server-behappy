const Joi = require("joi");

const timeSlotSchema = Joi.object({
    productId: Joi.string().required(),
    productCode: Joi.string().required(),
    timeSlotDate: Joi.date().required(),
});

module.exports = { timeSlotSchema };
