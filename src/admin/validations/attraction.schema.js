const Joi = require("joi");

const attractionSchema = Joi.object({
    title: Joi.string().required(),
    logo: Joi.string().allow("", null),
    category: Joi.string().required(),
    country: Joi.string().required(),
    state: Joi.string().required(),
    city: Joi.string().required(),
    area: Joi.string().allow("", null),
    longitude: Joi.string().required(),
    latitude: Joi.string().required(),
    bookingType: Joi.string()
        .allow(...["booking", "ticket"])
        .required(),
    destination: Joi.string().required(),
    isActive: Joi.boolean(),
    isCustomDate: Joi.boolean().required(),
    startDate: Joi.date()
        .allow("", null)
        .when("isCustomDate", {
            is: Joi.boolean().valid(true),
            then: Joi.date().required(),
        }),
    endDate: Joi.date()
        .allow("", null)
        .when("isCustomDate", {
            is: Joi.boolean().valid(true),
            then: Joi.date().required(),
        }),
    availability: Joi.array().items({
        _id: Joi.string(),
        isEnabled: Joi.boolean().required(),
        day: Joi.string().required(),
        open: Joi.string().when("isEnabled", {
            is: Joi.boolean().valid(true),
            then: Joi.string().required(),
        }),
        close: Joi.string().when("isEnabled", {
            is: Joi.boolean().valid(true),
            then: Joi.string().required(),
        }),
    }),
    offDates: Joi.array().items({
        _id: Joi.string(),
        from: Joi.date().required(),
        to: Joi.date().required(),
    }),
    durationType: Joi.string().valid("hours", "days", "months").required(),
    duration: Joi.number().required(),
    mapLink: Joi.string().allow("", null),
    isOffer: Joi.boolean().required(),
    offerAmountType: Joi.string().when("isOffer", {
        is: Joi.boolean().valid(true),
        then: Joi.string()
            .valid(...["flat", "percentage"])
            .required(),
    }),
    offerAmount: Joi.number()
        .allow("", null)
        .when("isOffer", {
            is: Joi.boolean().valid(true),
            then: Joi.number().required(),
        }),
    youtubeLink: Joi.string().required(),
    highlights: Joi.string().required(),
    itineraryDescription: Joi.string().allow("", null),

    sections: Joi.array().items({
        _id: Joi.string(),
        title: Joi.string().required(),
        body: Joi.string().required(),
    }),
    oldImages: Joi.array(),
    faqs: Joi.array().items({
        _id: Joi.string(),
        question: Joi.string().required(),
        answer: Joi.string().required(),
    }),
    isApiConnected: Joi.boolean().required(),
    connectedApi: Joi.string()
        .allow("", null)
        .when("isApiConnected", {
            is: Joi.boolean().valid(true),
            then: Joi.string().required(),
        }),
    cancellationType: Joi.string()
        .valid("nonRefundable", "freeCancellation", "cancelWithFee")
        .required(),
    cancelBeforeTime: Joi.number()
        .allow("", null)
        .when("cancellationType", {
            is: Joi.string().valid("cancel-with-fee", "free-cancellation"),
            then: Joi.number().required(),
        }),
    cancellationFee: Joi.number()
        .allow("", null)
        .when("cancellationType", {
            is: Joi.string().valid("cancel-with-fee"),
            then: Joi.number().required(),
        }),
    isCombo: Joi.boolean().required(),
    bookingPriorDays: Joi.when("bookingType", {
        is: Joi.string().valid("booking"),
        then: Joi.number().required(),
        otherwise: Joi.allow("", null),
    }),
    displayOrder: Joi.number().allow("", null),
});

const attractionActivitySchema = Joi.object({
    attraction: Joi.string().required(),
    name: Joi.string().required(),
    activityType: Joi.string().valid("normal", "transfer").required(),
    base: Joi.string()
        .valid(...["person", "private", "hourly"])
        .required(),
    description: Joi.string().allow("", null),
    adultAgeLimit: Joi.number().required().min(0),
    childAgeLimit: Joi.number().required().min(0),
    infantAgeLimit: Joi.number().required().min(0),
    adultCost: Joi.number().allow("", null),
    childCost: Joi.number().allow("", null),
    infantCost: Joi.number().allow("", null),
    hourlyCost: Joi.number().allow("", null),
    isVat: Joi.boolean().required(),
    vat: Joi.number()
        .allow("", null)
        .when("isVat", {
            is: Joi.boolean().valid(true),
            then: Joi.number().required(),
        }),
    isPromoCode: Joi.boolean().required(),
    promoCode: Joi.when("isPromoCode", {
        is: Joi.boolean().valid(true),
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    promoAmountAdult: Joi.when("isPromoCode", {
        is: Joi.boolean().valid(true),
        then: Joi.number().required(),
        otherwise: Joi.number().allow("", null),
    }),
    promoAmountChild: Joi.when("isPromoCode", {
        is: Joi.boolean().valid(true),
        then: Joi.number().required(),
        otherwise: Joi.number().allow("", null),
    }),
    isB2bPromoCode: Joi.boolean().required(),
    b2bPromoCode: Joi.when("isB2bPromoCode", {
        is: Joi.boolean().valid(true),
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    b2bPromoAmountAdult: Joi.when("isB2bPromoCode", {
        is: Joi.boolean().valid(true),
        then: Joi.number().required(),
        otherwise: Joi.number().allow("", null),
    }),
    b2bPromoAmountChild: Joi.when("isB2bPromoCode", {
        is: Joi.boolean().valid(true),
        then: Joi.number().required(),
        otherwise: Joi.number().allow("", null),
    }),
    isSharedTransferAvailable: Joi.boolean().required(),
    sharedTransferPrice: Joi.when("isSharedTransferAvailable", {
        is: Joi.boolean().valid(true),
        then: Joi.number().required(),
        otherwise: Joi.number().allow("", null),
    }),
    sharedTransferCost: Joi.when("isSharedTransferAvailable", {
        is: Joi.boolean().valid(true),
        then: Joi.number().required(),
        otherwise: Joi.number().allow("", null),
    }),
    isPrivateTransferAvailable: Joi.boolean().required(),
    privateTransfers: Joi.array().when("isPrivateTransferAvailable", {
        is: Joi.boolean().valid(true),
        then: Joi.array()
            .items(
                Joi.object({
                    name: Joi.string().required(),
                    maxCapacity: Joi.number().required(),
                    price: Joi.number().required(),
                    cost: Joi.number().required(),
                    _id: Joi.string().allow("", null),
                })
            )
            .min(1),
    }),
    isActive: Joi.boolean(),
    peakTime: Joi.date().allow("", null),
    note: Joi.string().allow("", null),
    bookingType: Joi.string().valid("booking", "ticket").required(),
    markupUpdate: Joi.array().items(
        Joi.object({
            profileId: Joi.string().required(),
            markup: Joi.number().required(),
            markupType: Joi.string().required(),
        })
    ),
    oldImages: Joi.array(),
    termsAndConditions: Joi.string().allow("", null),
    overview: Joi.string().allow("", null),
    inculsionsAndExclusions: Joi.string().allow("", null),
});

const attractionTicketUploadSchema = Joi.object({
    activity: Joi.string().required(),
});

module.exports = {
    attractionSchema,
    attractionActivitySchema,
    attractionTicketUploadSchema,
};
