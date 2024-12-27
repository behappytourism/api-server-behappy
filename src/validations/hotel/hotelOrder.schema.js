const Joi = require("joi");

const hotelOrderSchema = Joi.object({
    searchId: Joi.string().required(),
    hotelId: Joi.string().required(),
    rateKey: Joi.string().required(),
    travellerDetails: Joi.array()
        .items({
            roomId: Joi.number().required(),
            title: Joi.string().required(),
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
        })
        .required(),
    contactDetails: Joi.object({
        name: Joi.string().required(),
        country: Joi.string().required(),
        phoneNumber: Joi.number().required(),
        email: Joi.string().email().required(),
    }),
    specialRequest: Joi.string().allow("", null),
    paymentMethod: Joi.string().required().allow("wallet", "ccavenue"),
});

const hotelOrderPayLaterSchema = Joi.object({
    searchId: Joi.string().required(),
    hotelId: Joi.string().required(),
    rateKey: Joi.string().required(),
    travellerDetails: Joi.array()
        .items({
            roomId: Joi.number().required(),
            title: Joi.string().required(),
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
        })
        .required(),
    contactDetails: Joi.object({
        country: Joi.string().required(),
        phoneNumber: Joi.number().required(),
        email: Joi.string().email().required(),
    }),
    specialRequest: Joi.string().allow("", null),
});

const hotelOrderInitiatePaymentSchema = Joi.object({
    paymentMethod: Joi.string().required().allow("wallet", "ccavenue"),
    orderId: Joi.string().required(),
});

module.exports = { hotelOrderSchema, hotelOrderPayLaterSchema, hotelOrderInitiatePaymentSchema };
