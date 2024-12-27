const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const {
    AttractionCategory,
    AffiliateSettings,
    AffiliateRedeem,
    AffiliateUser,
} = require("../../../models");
const {
    admAffiliateSettingsSchema,
} = require("../../validations/affiliate/admAffiliateSettings.schema");

module.exports = {
    listAllRedeemRequest: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            let filters = {};
            if (searchQuery && searchQuery !== "") {
                filters.name = {
                    $regex: searchQuery,
                    $options: "i",
                };
            }
            const redeemRequests = await AffiliateRedeem.aggregate([
                {
                    $match: {
                        status: { $ne: "initiated" },
                    },
                },
                {
                    $lookup: {
                        from: "users", // Replace with the actual name of the user collection
                        localField: "user",
                        foreignField: "_id",
                        as: "user",
                    },
                },
                {
                    $lookup: {
                        from: "financialuserdatas", // Replace with the actual name of the user collection
                        localField: "financialData",
                        foreignField: "_id",
                        as: "financialData",
                    },
                },
                {
                    $set: {
                        user: { $arrayElemAt: ["$user", 0] },
                        financialData: { $arrayElemAt: ["$financialData", 0] },
                    },
                },
                {
                    $project: {
                        currency: 1,
                        points: 1,
                        financialData: 1,
                        feeDeduction: 1,
                        amount: 1,
                        isDeleted: 1,
                        status: 1,
                        "user.name": 1,
                        "user.email": 1,
                        reason: 1,
                        transactionNo: 1,
                    },
                },
                {
                    $sort: {
                        createdAt: -1,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalRequest: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalRequest: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            // redeemRequests now contains an array of documents with the selected user fields

            if (!redeemRequests[0]) {
                return sendErrorResponse(res, 400, "Invalid attraction id");
            }

            res.status(200).json({
                redeemRequests: redeemRequests[0].data,
                totalRequest: redeemRequests[0].totalRequest,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    onRedeemRequestCheck: async (req, res) => {
        try {
            const { value, requestId, reason } = req.body;

            console.log(value, requestId, "value, requestId");
            const redeemRequest = await AffiliateRedeem.findOne({
                _id: requestId,
                status: "pending",
            });

            if (!redeemRequest) {
                return sendErrorResponse(
                    res,
                    400,
                    "redeem request not found or status is not pending"
                );
            }

            if (value === "approved") {
                const affiliateUser = await AffiliateUser.findOne({
                    user: redeemRequest.user,
                    isActive: true,
                });

                if (!affiliateUser) {
                    return sendErrorResponse(res, 400, "user not found or status is disabled");
                }

                if (affiliateUser.totalPoints < redeemRequest.points) {
                    return sendErrorResponse(res, 400, "user donot have points complete withdraw");
                }

                affiliateUser.totalPoints -= redeemRequest.points;
                await affiliateUser.save();

                redeemRequest.reason = reason;

                redeemRequest.status = "approved";
                await redeemRequest.save();

                res.status(200).json({
                    // redeemId: redeemRequest._id,
                    message: "approved successfully ",
                });
            } else if (value === "cancelled") {
                redeemRequest.reason = reason;
                redeemRequest.status = "cancelled";
                await redeemRequest.save();
                res.status(200).json({
                    // redeemId: redeemRequest?._id,
                    message: "cancelled successfully ",
                });
            } else {
                return sendErrorResponse(res, 400, "value is not found ");
            }
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },
};
