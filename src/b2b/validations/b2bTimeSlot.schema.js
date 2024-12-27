const Joi = require("joi");

const b2bTimeSlotSchema = Joi.object({
    productId: Joi.string().required(),
    productCode: Joi.string().required(),
    timeSlotDate: Joi.date().required(),
    activityId: Joi.string().required(),
});

module.exports = { b2bTimeSlotSchema };
