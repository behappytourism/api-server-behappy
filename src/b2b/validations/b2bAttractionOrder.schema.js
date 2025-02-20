const Joi = require("joi");

const b2bAttractionOrderSchema = Joi.object({
    agentReferenceNumber: Joi.string().required(),
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
            adultsCount: Joi.number().required().min(0).precision(0),
            childrenCount: Joi.number().required().min(0).precision(0),
            infantCount: Joi.number().required().min(0).precision(0),
            hoursCount: Joi.number().allow("", null).min(1).precision(0),
            transferType: Joi.string().valid("without", "shared", "private").required(),
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
    paymentMethod: Joi.string().required().valid("wallet", "ccavenue", "tabby"),
});

const b2bAttractionOrderCaptureSchema = Joi.object({
    orderId: Joi.string().allow("", null),
    paymentId: Joi.string().allow("", null),
});

module.exports = {
    b2bAttractionOrderSchema,
    b2bAttractionOrderCaptureSchema,
};
