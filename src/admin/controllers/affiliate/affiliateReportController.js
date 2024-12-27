const { isValidObjectId, Types } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const {
    AttractionCategory,
    AffiliateSettings,
    AffiliateUser,
    AffiliateClickHistory,
    AffiliatePointHistory,
} = require("../../../models");
const {
    admAffiliateSettingsSchema,
} = require("../../validations/affiliate/admAffiliateSettings.schema");

module.exports = {
    listAffiliateReports: async (req, res) => {
        try {
            const totalClicks = await AffiliateClickHistory.aggregate([
                // { $match: { clickType: "attraction" } },
                {
                    $group: {
                        _id: null,
                        totalClicks: { $sum: 1 },
                    },
                },
            ]);

            const totalPoints = await AffiliatePointHistory.aggregate([
                // { $match: { status: "success" } },
                {
                    $group: {
                        _id: null,
                        totalTransation: { $sum: 1 },
                        totalPoints: { $sum: "$points" },
                    },
                },
            ]);

            const topAffiliateReports = await AffiliateUser.find({ isActive: true })
                .sort({ totalPoints: -1 })
                .populate({
                    path: "user",
                    select: "name email", // Specify the fields you want to select
                });

            const topClickedAttractions = await AffiliateClickHistory.aggregate([
                {
                    $group: {
                        _id: "$attraction", // Group by the attraction field
                        count: { $sum: 1 }, // Count the occurrences of each attraction
                    },
                },
                {
                    $sort: { count: -1 }, // Sort by count in descending order (-1)
                },
                {
                    $limit: 10, // Limit the results to the top 10 attractions (adjust as needed)
                },
                {
                    $lookup: {
                        from: "attractions", // Use the name of your Attraction collection
                        localField: "_id", // Field from the current collection (AffiliateClickHistory)
                        foreignField: "_id", // Field from the referenced collection (Attraction)
                        as: "attractionInfo", // Alias for the joined data
                    },
                },
                {
                    $set: {
                        attractionInfo: { $arrayElemAt: ["$attractionInfo.title", 0] },
                    },
                },
            ]);

            res.status(200).json({
                totalClicks: totalClicks[0]?.totalClicks || 0,
                totalPoints: totalPoints[0].totalPoints || 0,
                totalOrders: totalPoints[0].totalTransation || 0,
                topClickedAttractions,
                topAffiliateReports,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    singleUserPointHistory: async (req, res) => {
        try {
            const { skip = 0, limit = 10, userId } = req.query;

            if (!isValidObjectId(userId)) {
                return sendErrorResponse(res, 400, "invalid user Id");
            }

            const pointHistory = await AffiliatePointHistory.aggregate([
                { $match: { user: Types.ObjectId(userId) } },
                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        total: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                pointHistory: pointHistory[0]?.data || [],
                totalPointHistory: pointHistory[0]?.total || 0,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
