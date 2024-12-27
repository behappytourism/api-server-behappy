const { sendErrorResponse } = require("../../../helpers");
const { B2bPromoCode } = require("../../models");
const { Types, isValidObjectId } = require("mongoose");
const {
    promoCodeEligibiltyCheck,
    promoCodeEligibiltyCheckHelper,
} = require("../../helpers/promoCode/promoCodeHelper");

module.exports = {
    getPromoCodes: async (req, res) => {
        try {
            const promoCodes = await B2bPromoCode.aggregate([
                {
                    $match: {
                        $and: [
                            {
                                $or: [
                                    {
                                        $and: [
                                            { isSpecific: true },
                                            {
                                                users: {
                                                    $in: [Types.ObjectId(req.reseller._id)],
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
                                                    {
                                                        $eq: [
                                                            "$$order.resellerId",
                                                            Types.ObjectId(req.reseller._id),
                                                        ],
                                                    },
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
            console.log(promoCodes);

            res.status(200).json(promoCodes);
        } catch (err) {
            console.log(err);
            // sendErrorResponse(res, 500, err);
        }
    },
    promoCodeEligibiltyCheck: async (req, res) => {
        try {
            const { selectedJourneys, selectedActivities, promoCode } = req.body;

            const { discountAmount } = await promoCodeEligibiltyCheckHelper({
                selectedJourneys,
                selectedActivities,
                code: promoCode,
                req,
                resellerId: req.reseller._id,
            });

            res.status(200).send({
                message: "eligible",
                promoCode,
                discountAmount: discountAmount,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
