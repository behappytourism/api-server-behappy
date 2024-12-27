const Joi = require("joi");

const hotelOrderConfirmSchema = Joi.object({
    hotelBookingId: Joi.string().required(),
});

const hotelOrderCancelSchema = Joi.object({
    cancellationCharge: Joi.number().required().min(0),
    cancellationRemark: Joi.string().allow("", null),
});

const hotelOrderCancellationRequestApproveSchema = Joi.object({
    cancellationCharge: Joi.number().required().min(0),
});

module.exports = {
    hotelOrderConfirmSchema,
    hotelOrderCancelSchema,
    hotelOrderCancellationRequestApproveSchema,
};
