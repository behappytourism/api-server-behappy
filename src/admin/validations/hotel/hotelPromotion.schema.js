const Joi = require("joi");

const hotelPromotionSchema = Joi.object({
    promotionCode: Joi.string().required(),
    name: Joi.string().required(),
    hotel: Joi.string().required(),
    contractGroups: Joi.array().items(Joi.string().required()).required().min(1),
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
    sellFrom: Joi.date().required(),
    sellTo: Joi.date().required(),
    priority: Joi.number().required().min(0).precision(0),
    isCombinedPromotion: Joi.boolean().required(),
    combinedPromotions: Joi.array().when("isCombinedPromotion", {
        is: Joi.boolean().valid(true),
        then: Joi.array().required().min(1).items(Joi.string().required()),
    }),
    isDiscountAvailable: Joi.boolean().required(),
    isStayPayAvailable: Joi.boolean().required(),
    isMealUpgradeAvailable: Joi.boolean().required(),
    isRoomTypeUpgradeAvailable: Joi.boolean().required(),
    bookingWindowFrom: Joi.date().required(),
    bookingWindowTo: Joi.date().required(),
    specificNations: Joi.boolean().required(),
    applicableNations: Joi.array().items(Joi.string()),
    isApplicableForExtraBed: Joi.boolean().required(),
    isApplicableForSupplement: Joi.boolean().required(),
    isApplicableForAddOn: Joi.boolean().required(),
    discounts: Joi.array().items({
        rateCode: Joi.string().required(),
        fromDate: Joi.date().required(),
        toDate: Joi.date().required(),
        bookBefore: Joi.number().required(),
        boardTypes: Joi.array().items(Joi.string().required()).required().min(1),
        minimumLengthOfStay: Joi.number().required(),
        maximumLengthOfStay: Joi.number().required(),
        discountType: Joi.string().required("flat", "percentage"),
        roomTypes: Joi.array()
            .items({
                roomTypeId: Joi.string().required(),
                roomName: Joi.string().allow(""),
                roomOccupancies: Joi.array()
                    .items({
                        occupancyId: Joi.string().required(),
                        shortName: Joi.string().required(),
                        discount: Joi.number().allow("", null),
                    })
                    .required(),
            })
            .required(),
    }),
    stayPays: Joi.array().items({
        rateCode: Joi.string().required(),
        fromDate: Joi.date().required(),
        toDate: Joi.date().required(),
        bookBefore: Joi.number().required().min(0).precision(0),
        roomTypes: Joi.array().items(Joi.string().required()).required().min(1),
        boardTypes: Joi.array().items(Joi.string().required()).required().min(1),
        stayCount: Joi.number().required().min(1).precision(0),
        freeCount: Joi.number().required().min(0).precision(0),
    }),
    roomTypeUpgrades: Joi.array().items({
        rateCode: Joi.string().required(),
        fromDate: Joi.date().required(),
        toDate: Joi.date().required(),
        bookBefore: Joi.number().required().min(0).precision(0),
        boardTypes: Joi.array().items(Joi.string().required()).required().min(1),
        roomTypeFrom: Joi.string().required(),
        roomTypeTo: Joi.string().required(),
        minimumLengthOfStay: Joi.number().required().min(1).precision(0),
        maximumLengthOfStay: Joi.number().required().min(1).precision(0),
    }),
    mealUpgradeOn: Joi.string().required().valid("base-plan", "extra-supplement", "both"),
    mealUpgrades: Joi.array().items({
        rateCode: Joi.string().required(),
        fromDate: Joi.date().required(),
        toDate: Joi.date().required(),
        bookBefore: Joi.number().required().min(0).precision(0),
        roomTypes: Joi.array().items(Joi.string().required()).required().min(1),
        mealFrom: Joi.string().required(),
        mealTo: Joi.string().required(),
        minimumLengthOfStay: Joi.number().required().min(1).precision(0),
        maximumLengthOfStay: Joi.number().required().min(1).precision(0),
    }),
    roomDiscounts: Joi.array().items({
        rateCode: Joi.string().required(),
        fromDate: Joi.date().required(),
        toDate: Joi.date().required(),
        roomTypes: Joi.array().items(Joi.string().required()).required().min(1),
        boardTypes: Joi.array().items(Joi.string().required()).required().min(1),
        bookBefore: Joi.number().required().min(0).precision(0),
        roomCount: Joi.number().required().min(1).precision(0),
        applicableTill: Joi.number().required().min(1).precision(0),
        discountType: Joi.string().required().valid("flat", "percentage"),
        discount: Joi.number().required().min(0),
        minimumLengthOfStay: Joi.number().required().min(1).precision(0),
        maximumLengthOfStay: Joi.number().required().min(1).precision(0),
    }),
    cancellationPolicies: Joi.array().items({
        fromDate: Joi.date().required(),
        toDate: Joi.date().required(),
        roomTypes: Joi.array().items(Joi.string()).min(1),
        cancellationType: Joi.number().required().valid("refundable", "non-refundable"),
        cancellationChargeType: Joi.number().required().valid("flat", "percentage", "night"),
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
    excludedDates: Joi.array()
        .items({
            fromDate: Joi.date().required(),
            toDate: Joi.date().required(),
            roomTypes: Joi.array().required(),
        })
        .required(),
    isActive: Joi.boolean().required(),
    multipleStayPay: Joi.boolean().required(),
    stayPayFreeOn: Joi.string()
        .required()
        .valid("cheapest", "first-night", "last-night", "highest"),
    applicableOnRatePromotion: Joi.boolean().required(),
});

module.exports = { hotelPromotionSchema };
