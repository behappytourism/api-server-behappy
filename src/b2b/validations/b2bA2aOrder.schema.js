const Joi = require("joi");

const b2bA2aOrderSchema = Joi.object({
    a2aTicket: Joi.string().required(),
    date: Joi.date().required(),
    noOfTravellers: Joi.number().required(),
    markup: Joi.number().required(),
    passengerDetails: Joi.array()
        .min(1)
        .required()
        .items({
            title: Joi.string().required(),
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            code: Joi.number().allow("", null),
            phoneNumber: Joi.number().required(),
            reference: Joi.string().allow("", null),
            nationality: Joi.string().required(),
            passportNo: Joi.string().required(),
            isInfant: Joi.boolean().required(),
            infantDetails: Joi.when("isInfant", {
                is: true,
                then: Joi.object({
                    title: Joi.string().required(),
                    firstName: Joi.string().required(),
                    lastName: Joi.string().required(),
                    passportNo: Joi.string().required(),
                }).required(),
                otherwise: Joi.forbidden(),
            }),
        }),
});

const b2bA2aOrderUpdateSchema = Joi.object({
    title: Joi.string().valid("mr", "ms", "mrs", "mstr").lowercase().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    code: Joi.number().allow("", null),
    phoneNumber: Joi.number().required(),
    nationality: Joi.string().required(),
    passportNo: Joi.string().required(),
    reference: Joi.string().allow("", null),
});

module.exports = { b2bA2aOrderSchema, b2bA2aOrderUpdateSchema };
