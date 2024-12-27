const { B2bPromoCode } = require("../../models");
const { attractionPromoCodeHelper } = require("../attraction/b2bAttractionOrderHelper");
const { b2bTransferOrderCalculations } = require("../order/b2bCreateOrderHelper");

const promoCodeEligibiltyCheckHelper = async ({
    selectedJourneys,
    selectedActivities,
    code,
    resellerId,
    req,
}) => {
    try {
        let amount = 0;
        const promoCodes = await B2bPromoCode.aggregate([
            {
                $match: {
                    code: code,
                    $and: [
                        {
                            $or: [
                                {
                                    $and: [
                                        { isSpecific: true },
                                        {
                                            users: {
                                                $in: [resellerId],
                                            },
                                        },
                                    ],
                                },
                                { isSpecific: false }, // If isSpecific field doesn't exist or is false
                            ],
                        },
                        {
                            $or: [
                                {
                                    $and: [
                                        { isValid: true },
                                        { fromValidity: { $lte: new Date() } },
                                        { toValidity: { $gte: new Date() } },
                                    ],
                                },
                                { isValid: false },
                            ],
                        },
                    ],
                },
            },
            {
                $addFields: {
                    orderCount: {
                        $cond: {
                            if: { $isArray: "$orders" },
                            then: {
                                $size: {
                                    $filter: {
                                        input: "$orders",
                                        as: "order",
                                        cond: {
                                            $and: [
                                                { $eq: ["$$order.resellerId", resellerId] },
                                                { $eq: ["$$order.status", "completed"] },
                                            ],
                                        },
                                    },
                                },
                            },
                            else: 0,
                        },
                    },
                    totalUsed: "$totalUsed",
                },
            },
            {
                $addFields: {
                    perPersonUsageCountDifference: {
                        $subtract: ["$useagePerPersonCount", "$orderCount"],
                    },
                    usageCountDifference: {
                        $subtract: ["$useageCount", "$totalUsed"],
                    },
                },
            },
            {
                $match: {
                    usageCountDifference: { $gt: 0 },
                    perPersonUsageCountDifference: { $gt: 0 },
                },
            },
            {
                $project: {
                    code: 1,
                    product: 1,
                    type: 1,
                    value: 1,
                    isValid: 1,
                    fromValidity: 1,
                    toValidity: 1,
                    maxPromoDiscount: 1,
                    minPurchaseValue: 1,
                    orderCount: 1,
                    totalUsed: 1,
                    useagePerPersonCount: 1,
                    useageCount: 1,
                },
            },
        ]);

        console.log(promoCodes, "promoCodes");

        const promoCode = promoCodes[0];

        if (!promoCode) {
            throw new Error("promocode cannot be applied  ");
        }
        console.log(promoCode);

        if (promoCode.product.includes("transfer")) {
            const { totalNetFare } = await b2bTransferOrderCalculations({
                journeys: selectedJourneys,
                req,
            });
            console.log(totalNetFare);

            amount += totalNetFare;
        }

        if (promoCode.product.includes("attraction")) {
            const { totalAmount } = await attractionPromoCodeHelper({
                reseller: req.reseller,
                selectedActivities,
            });
            console.log(totalAmount);

            amount += totalAmount;
        }

        if (amount < promoCode.minPurchaseValue) {
            throw new Error(
                "amount is less than minimum purchase amount! so promocode cannot be applied  "
            );
        }

        let discountAmount = 0;
        if (promoCode.type === "flat") {
            discountAmount = promoCode.value;
        } else {
            discountAmount = (promoCode.value * amount) / 100;
        }

        if (discountAmount > promoCode.maxPromoDiscount) {
            discountAmount = promoCode.maxPromoDiscount;
        }

        return { discountAmount };

        console.log(promoCode);
    } catch (e) {
        throw e;
    }
};

const promoCodeCheckoutHelper = async ({ code, resellerId, amount }) => {
    try {
        const promoCode = await B2bPromoCode.findOne(
            {
                code: code,
                $and: [
                    {
                        $or: [
                            {
                                $and: [
                                    { isSpecific: true },
                                    {
                                        users: {
                                            $in: [resellerId],
                                        },
                                    },
                                ],
                            },
                            { isSpecific: false }, // If isSpecific field doesn't exist or is false
                        ],
                    },
                    {
                        $or: [
                            {
                                $and: [
                                    { isValid: true },
                                    { fromValidity: { $lte: new Date() } },
                                    { toValidity: { $gte: new Date() } },
                                ],
                            },
                            { isValid: false },
                        ],
                    },
                ],
            },
            {
                $addFields: {
                    orderCount: {
                        $cond: {
                            if: { $isArray: "$orders" },
                            then: {
                                $size: {
                                    $filter: {
                                        input: "$orders",
                                        as: "order",
                                        $and: [
                                            { $eq: ["$$order.resellerId", req.reseller._id] },
                                            { $eq: ["$$order.status", "completed"] },
                                        ],
                                    },
                                },
                            },
                            else: 0,
                        },
                    },
                },
            },
            {
                $match: {
                    orderCount: { $lte: "$usagePerPersonCount" },
                },
            },
            {
                $match: {
                    totalUsed: { $lte: "$useageCount" },
                },
            },
            {
                code: 1,
                product: 1,
                type: 1,
                value: 1,
                isValid: 1,
                fromValidity: 1,
                toValidity: 1,
                maxPromoDiscount: 1,
                minPurchaseValue: 1,
            }
        );

        if (!promoCode) {
            throw new Error("promocode cannot be applied  ");
        }

        if (amount < promoCode.minPurchaseValue) {
            throw new Error(
                "amount is less than minimum purchase amount! so promocode cannot be applied  "
            );
        }

        let discountAmount = 0;
        if (promoCode.type === "flat") {
            discountAmount = promoCode.value;
        } else {
            discountAmount = (promoCode.value * amount) / 100;
        }

        if (discountAmount > promoCode.maxPromoDiscount) {
            discountAmount = promoCode.maxPromoDiscount;
        }

        return { discountAmount };
    } catch (e) {}
};

const promoCodeCompeleteHelper = async ({ code, orderId, resellerId, discountAmount }) => {
    try {
        const updatedPromoCode = await B2bPromoCode.findOneAndUpdate(
            {
                code: code,
            },
            {
                $push: {
                    orders: {
                        orderId: orderId,
                        discountAmount,
                        resellerId: resellerId,
                    },
                },
            },
            {
                new: true,
            }
        );

        return { promocode_id: updatedPromoCode };
    } catch (e) {
        throw e;
    }
};

module.exports = { promoCodeEligibiltyCheckHelper, promoCodeCompeleteHelper };
