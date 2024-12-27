const Joi = require("joi");

const b2bTransferAvailabilitySchema = Joi.object({
    transferType: Joi.string().required().allow("oneway", "return"),
    pickupLocation: Joi.string().required(),
    dropOffLocation: Joi.string().required(),
    dropOffSuggestionType: Joi.string().required(),
    pickupSuggestionType: Joi.string().required(),
    pickupDate: Joi.date().required(),
    pickupTime: Joi.string().required(),
    returnDate: Joi.when("transferType", {
        is: Joi.string().valid("return"),
        then: Joi.date().required(),
        otherwise: Joi.date().allow("", null),
    }),
    returnTime: Joi.when("transferType", {
        is: Joi.string().valid("return"),
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    noOfAdults: Joi.number().required(),
    noOfChildrens: Joi.number().required(),
});

const b2bTransferOrderSchema = Joi.object({
    name: Joi.string().required(),
    phoneNumber: Joi.number().required(),
    country: Joi.string().required(),
    email: Joi.string().email().required(),
    journeys: Joi.array()
        .min(1)
        .required()
        .items({
            transferType: Joi.string().required().allow("oneway", "return"),
            pickupLocation: Joi.string().required(),
            dropOffLocation: Joi.string().required(),
            dropOffSuggestionType: Joi.string().required(),
            pickupSuggestionType: Joi.string().required(),
            pickupDate: Joi.date().required(),
            pickupTime: Joi.string().required(),
            returnDate: Joi.when("transferType", {
                is: Joi.string().valid("return"),
                then: Joi.date().required(),
                otherwise: Joi.date().allow("", null),
            }),
            returnTime: Joi.when("transferType", {
                is: Joi.string().valid("return"),
                then: Joi.string().required(),
                otherwise: Joi.string().allow("", null),
            }),
            noOfAdults: Joi.number().required(),
            noOfChildrens: Joi.number().required(),
            selectedVehicleTypes: Joi.array()
                .min(1)
                .required()
                .items({
                    vehicle: Joi.string().required(),
                    count: Joi.number().required().min(1).precision(0),
                }),
            selectedReturnVehicleTypes: Joi.when("transferType", {
                is: Joi.string().valid("return"),
                then: Joi.array()
                    .min(1)
                    .required()
                    .items({
                        vehicle: Joi.string().required(),
                        count: Joi.number().required().min(1).precision(0),
                    }),
                otherwise: Joi.array().allow("", null),
            }),
        }),
    paymentMethod: Joi.string().required().allow("wallet", "ccavenue"),
});
module.exports = { b2bTransferAvailabilitySchema, b2bTransferOrderSchema };
