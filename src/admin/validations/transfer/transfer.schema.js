const Joi = require("joi");

const transferSchema = Joi.object({
    transferFrom: Joi.string().required(),
    transferTo: Joi.string().required(),
    vehicleTypes: Joi.array()
        .items({
            vehicleType: Joi.string().required(),
            price: Joi.number().required().min(0),
        })
        .required()
        .min(1),
});

module.exports = { transferSchema };
