const Joi = require("joi");

const hotelContractSchema = Joi.object({
    contractGroup: Joi.string().required(),
    basePlan: Joi.string().required(),
    rateName: Joi.string().required(),
    rateCode: Joi.string().required(),
    checkInTime: Joi.string().required(),
    checkOutTime: Joi.string().required(),
    sellFrom: Joi.date().required(),
    sellTo: Joi.date().required(),
    priority: Joi.number().required().min(0).precision(0),
    isSpecialRate: Joi.boolean().required(),
    parentContract: Joi.when("isSpecialRate", {
        is: Joi.boolean().valid(true),
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    bookingWindowFrom: Joi.when("isSpecialRate", {
        is: Joi.boolean().valid(true),
        then: Joi.date().required(),
        otherwise: Joi.date().allow("", null),
    }),
    bookingWindowTo: Joi.when("isSpecialRate", {
        is: Joi.boolean().valid(true),
        then: Joi.date().required(),
        otherwise: Joi.date().allow("", null),
    }),
    isTourismFeeIncluded: Joi.boolean().required(),
    specificNations: Joi.boolean().required(),
    applicableNations: Joi.array().items(Joi.string()),
    roomRates: Joi.array()
        .items({
            rateCode: Joi.string().allow("", null),
            fromDate: Joi.date().required(),
            toDate: Joi.date().required(),
            validDays: Joi.array()
                .items(
                    Joi.string().valid(
                        "sunday",
                        "monday",
                        "tuesday",
                        "wednesday",
                        "thursday",
                        "friday",
                        "saturday"
                    )
                )
                .required()
                .min(1),
            minimumLengthOfStay: Joi.number().required().min(1).precision(0),
            maximumLengthOfStay: Joi.number().required().min(1).precision(0),
            roomTypes: Joi.array()
                .items({
                    roomTypeId: Joi.string().required(),
                    roomName: Joi.string().allow(""),
                    roomOccupancies: Joi.array()
                        .items({
                            occupancyId: Joi.string().required(),
                            shortName: Joi.string().required(),
                            price: Joi.number().allow("", null),
                        })
                        .min(1),
                })
                .min(1),
        })
        .min(1),
    mealSupplements: Joi.array().items({
        fromDate: Joi.date().required(),
        toDate: Joi.date().required(),
        boardType: Joi.string().required(),
        roomTypes: Joi.array().items(Joi.string()).min(1),
        adultPrice: Joi.number().required().min(0),
        childPrice: Joi.number().required().min(0),
        infantPrice: Joi.number().required().min(0),
    }),
    cancellationPolicies: Joi.array().items({
        fromDate: Joi.date().required(),
        toDate: Joi.date().required(),
        roomTypes: Joi.array().items(Joi.string()).min(1),
        cancellationType: Joi.string().required().valid("refundable", "non-refundable"),
        cancellationChargeType: Joi.string().required().valid("flat", "percentage", "night"),
        daysBefore: Joi.when("cancellationType", {
            is: Joi.boolean().valid("refundable"),
            then: Joi.number().required().min(0).precision(0),
            otherwise: Joi.number().allow("", null),
        }),
        cancellationCharge: Joi.when("cancellationType", {
            is: Joi.boolean().valid("refundable"),
            then: Joi.number().required().min(0),
            otherwise: Joi.number().allow("", null),
        }),
        requestCancelDaysBefore: Joi.when("cancellationType", {
            is: Joi.boolean().valid("refundable"),
            then: Joi.number().required().min(0).precision(0),
            otherwise: Joi.number().allow("", null),
        }),
    }),
    extraSupplements: Joi.array().items({
        fromDate: Joi.date().required(),
        toDate: Joi.date().required(),
        roomTypes: Joi.array().items(Joi.string()).min(1),
        extraBedAdultPrice: Joi.number().required().min(0),
        extraBedChildPrice: Joi.number().required().min(0),
        isMealIncluded: Joi.boolean().required(),
        exbMealPriceAdult: Joi.when("isMealIncluded", {
            is: Joi.boolean().valid(false),
            then: Joi.number().required().min(0),
            otherwise: Joi.number().allow("", null),
        }),
        exbMealPriceChild: Joi.when("isMealIncluded", {
            is: Joi.boolean().valid(false),
            then: Joi.number().required().min(0),
            otherwise: Joi.number().allow("", null),
        }),
    }),
    childPolicies: Joi.array().items({
        fromDate: Joi.date().required(),
        toDate: Joi.date().required(),
        roomTypes: Joi.array().items(Joi.string()).min(1),
        fromAge: Joi.number().required().min(0),
        toAge: Joi.number().required().min(0),
        policies: Joi.array()
            .items({
                paxCount: Joi.number().required(),
                beddingIclusive: Joi.boolean().required(),
                beddingCharge: Joi.when("beddingIclusive", {
                    is: Joi.boolean().valid(false),
                    then: Joi.number().required().min(0),
                    otherwise: Joi.number().allow("", null),
                }),
                mealInclusive: Joi.boolean().required(),
                mealCharge: Joi.when("mealInclusive", {
                    is: Joi.boolean().valid(false),
                    then: Joi.number().required().min(0),
                    otherwise: Joi.number().allow("", null),
                }),
                _id: Joi.string().allow("", null),
            })
            .required(),
    }),
    // childMealPolicies: Joi.array().items({
    //     fromDate: Joi.date().required(),
    //     toDate: Joi.date().required(),
    //     roomTypes: Joi.array().items(Joi.string()).min(1),
    //     boardTypes: Joi.array().items(Joi.string()).min(1),
    //     fromAge: Joi.number().required().min(0),
    //     toAge: Joi.number().required().min(0),
    //     isFree: Joi.boolean().required(),
    //     totalFreePax: Joi.number().required().min(0).precision(0),
    //     isManualRate: Joi.boolean().required(),
    //     rate: Joi.number().required().min(0),
    // }),
    excludedDates: Joi.array()
        .items({
            fromDate: Joi.date().required(),
            toDate: Joi.date().required(),
            roomTypes: Joi.array().required(),
        })
        .required(),
    applyPromotion: Joi.boolean().required(),
    inclusions: Joi.string().allow("", null),
    termsAndConditions: Joi.string().required(),
    isActive: Joi.boolean().required(),
});

const hotelContractCloneSchema = Joi.object({
    rateName: Joi.string().required(),
    rateCode: Joi.string().required(),
    priority: Joi.number().required(),
    isExistingPromotion: Joi.boolean().required(),
});

const hotelContractGroupChangeSchema = Joi.object({
    contract: Joi.string().required(),
    contractGroup: Joi.string().required(),
});

module.exports = { hotelContractSchema, hotelContractCloneSchema, hotelContractGroupChangeSchema };
