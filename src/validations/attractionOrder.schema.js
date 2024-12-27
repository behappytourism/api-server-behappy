const Joi = require("joi");

const attractionOrderSchema = Joi.object({
    name: Joi.string().required(),
    phoneNumber: Joi.number().required(),
    country: Joi.string().required(),
    email: Joi.string().email().required(),
    selectedActivities: Joi.array()
        .min(1)
        .required()
        .items({
            activity: Joi.string().required(),
            date: Joi.date().required(),
            adultsCount: Joi.number().min(1).required(),
            childrenCount: Joi.number().allow("", null),
            infantCount: Joi.number().allow("", null),
            transferType: Joi.string().valid("without", "shared", "private"),
            slot: Joi.object({
                EventID: Joi.string().allow("", null),
                EventName: Joi.string().allow("", null),
                StartDateTime: Joi.string().isoDate().allow("", null),
                EndDateTime: Joi.string().isoDate().allow("", null),
                ResourceID: Joi.string().allow("", null),
                Status: Joi.string().allow("", null),
                AdultPrice: Joi.number().allow("", null),
                ChildPrice: Joi.number().allow("", null),
                Available: Joi.string().allow("", null),
            }).allow(null),
            isPromoAdded: Joi.boolean().allow("", null),
        }),
    paymentProcessor: Joi.string().required().valid("ccavenue", "paypal", "tabby", "razorpay"),
    digitalPlatform: Joi.string().allow("", null),
});

const attractionOrderCaptureSchema = Joi.object({
    orderId: Joi.string().required(),
    paymentId: Joi.string().required(),
});

module.exports = {
    attractionOrderSchema,
    attractionOrderCaptureSchema,
};
