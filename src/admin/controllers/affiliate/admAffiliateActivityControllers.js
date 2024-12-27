const { sendErrorResponse } = require("../../../helpers");
const {
    AttractionCategory,
    AffiliateSettings,
    Attraction,
    AffiliateActivity,
} = require("../../../models");
const {
    admAffiliateSettingsSchema,
} = require("../../validations/affiliate/admAffiliateSettings.schema");

module.exports = {
    affiliateActivityListing: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            console.log("searchQuery", searchQuery);
            let filters = {};
            if (searchQuery && searchQuery !== "") {
                filters.name = {
                    $regex: searchQuery,
                    $options: "i",
                };
            }
            const activities = await Attraction.aggregate([
                {
                    $match: {
                        isDeleted: false, // Assuming isDeleted is a field in the Attraction collection
                    },
                },
                {
                    $lookup: {
                        from: "attractionactivities",
                        let: { attractionId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$$attractionId", "$attraction"] },
                                            { $eq: ["$isDeleted", false] },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "activities",
                    },
                },
                {
                    $unwind: "$activities",
                },
                {
                    $replaceRoot: {
                        newRoot: "$activities",
                    },
                },
                {
                    $match: filters,
                },
                {
                    $lookup: {
                        from: "affiliateactivities",
                        localField: "_id",
                        foreignField: "activityId",
                        as: "affiliate",
                    },
                },
                {
                    $set: {
                        adultPoint: { $arrayElemAt: ["$affiliate.adultPoint", 0] },
                        childPoint: { $arrayElemAt: ["$affiliate.childPoint", 0] },
                        isActive: { $arrayElemAt: ["$affiliate.isActive", 0] },
                    },
                },
                {
                    $project: {
                        name: 1,
                        adultPoint: 1,
                        childPoint: 1,
                        isActive: 1,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalActivites: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalActivites: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            console.log(activities[0].data, "activites");

            res.status(200).json({
                activities: activities[0].data,
                totalActivites: activities[0].totalActivites,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAffiliateActivityPoints: async (req, res) => {
        try {
            const { activityId, adultPoint, childPoint } = req.body;

            const activityAffiliate = await AffiliateActivity.findOneAndUpdate(
                { activityId: activityId },
                {
                    $set: {
                        adultPoint: adultPoint,
                        childPoint: childPoint,
                    },
                },
                { new: true, upsert: true }
            );

            console.log(activityAffiliate, "activityAffiliate");

            res.status(200).json({ _id: activityAffiliate._id, message: "updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateActiveStatus: async (req, res) => {
        try {
            const { activityId, value } = req.body;

            const activityAffiliate = await AffiliateActivity.findOne({ activityId: activityId });

            if (activityAffiliate) {
                activityAffiliate.isActive = value;

                await activityAffiliate.save();
            } else {
                const newActivityAffiliate = new AffiliateActivity({
                    activityId,
                    adultPoint: 0,
                    childPoint: 0,
                    isActive: value,
                });

                await newActivityAffiliate.save();
            }

            res.status(200).json({ message: "updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
