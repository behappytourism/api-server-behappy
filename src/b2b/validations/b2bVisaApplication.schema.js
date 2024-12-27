const Joi = require("joi");

const visaApplicationSchema = Joi.object({
    visaType: Joi.string().required(),
    noOfAdult: Joi.number().required(),
    noOfChild: Joi.number().required(),
    travellers: Joi.array()
        .items(
            Joi.object({
                title: Joi.string().valid("mr", "ms", "mrs", "mstr").required(),
                firstName: Joi.string().required(),
                lastName: Joi.string().required(),
                paxType: Joi.string().valid("ADT", "CHD").required(),
                expiryDate: Joi.object({
                    day: Joi.number().required(),
                    month: Joi.number().required(),
                    year: Joi.number().required(),
                }).required(),
                dateOfBirth: Joi.object({
                    day: Joi.number().required(),
                    month: Joi.number().required(),
                    year: Joi.number().required(),
                }).required(),
                passportNo: Joi.string().required(),
                contactNo: Joi.number().required(),
                email: Joi.string().email().required(),
            })
        )
        .required(),
    nationality: Joi.string().required(),
});

const visaReapplySchema = Joi.object({
    title: Joi.string().valid("mr", "ms", "mrs", "mstr").required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    dateOfBirth: Joi.object({
        day: Joi.number().required(),
        month: Joi.number().required(),
        year: Joi.number().required(),
    }).required(),
    expiryDate: Joi.object({
        day: Joi.number().required(),
        month: Joi.number().required(),
        year: Joi.number().required(),
    }).required(),
    country: Joi.string().required(),
    passportNo: Joi.string().required(),
    contactNo: Joi.number().required(),
    email: Joi.string().email().required(),
});

module.exports = { visaApplicationSchema, visaReapplySchema };
