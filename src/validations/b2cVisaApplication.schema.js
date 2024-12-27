const Joi = require("joi");

const b2cVisaApplicationSchema = Joi.object({
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
                country: Joi.string().required(),
                passportNo: Joi.string().required(),
                contactNo: Joi.number().required(),
                email: Joi.string().email().required(),
            })
        )
        .required(),
    nationality: Joi.string().required(),
});

const visaOrderCaptureSchema = Joi.object({
    orderId: Joi.string().required(),
    paymentId: Joi.string().required(),
});

module.exports = { b2cVisaApplicationSchema, visaOrderCaptureSchema };
