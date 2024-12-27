const { isValidObjectId, Types } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { Attraction, AttractionActivity } = require("../../../models");
const { B2BSubAgentAttractionMarkup, Reseller } = require("../../models");
const {
    b2bSubAgentAttractionMarkupSchema,
} = require("../../validations/b2bSubAgentAttractionMark.model");

module.exports = {
    upsertB2bSubAgentAttractionMarkup: async (req, res) => {
        try {
            const { markupType, markup, activityId, subAgentId } = req.body;

            const { _, error } = b2bSubAgentAttractionMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "Invalid activityId id");
            }

            if (markup < 0) {
                return sendErrorResponse(res, 400, "Markup should be greater than zero");
            }

            const subAgent = await Reseller.findOne({
                _id: subAgentId,
                referredBy: req?.reseller?._id,
            });

            console.log(subAgent, "SubAgent found");

            if (!subAgent) {
                return sendErrorResponse(res, 400, "subagent not found");
            }

            const activityDetail = await AttractionActivity.findOne({
                _id: activityId,
                isDeleted: false,
            });

            if (!activityDetail) {
                return sendErrorResponse(res, 400, "Attraction Not Found");
            }

            const b2bClientAttractionMarkups = await B2BSubAgentAttractionMarkup.findOneAndUpdate(
                {
                    activityId,
                    resellerId: subAgentId,
                },
                {
                    activityId,
                    markupType,
                    markup,
                    resellerId: subAgentId,
                },
                { upsert: true, new: true, runValidators: true }
            );

            console.log(b2bClientAttractionMarkups, "b2bClientAttractionMarkups");

            let tempObj = Object(b2bClientAttractionMarkups);
            tempObj.activity = {
                _id: activityId?._id,
            };

            res.status(200).json(tempObj);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteB2bSubAgentAttractionMarkup: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid markup id");
            }

            const b2bClientAttractionMarkups = await B2BSubAgentAttractionMarkup.findByIdAndDelete(
                id
            );

            if (!b2bClientAttractionMarkups) {
                return sendErrorResponse(res, 404, "B2b Reseller Attraction markup not found");
            }

            res.status(200).json({
                message: "b2b Reseller attraction markup deleted successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    listAllAttractions: async (req, res) => {
        try {
            const { subAgentId } = req.params;
            const { skip = 0, limit = 10, search } = req.query;

            const filters1 = { isDeleted: false, isB2bActive: true };

            if (search && search !== "") {
                filters1.title = { $regex: search, $options: "i" };
            }

            console.log(subAgentId, "subAgentId");

            const attractions = await Attraction.aggregate([
                { $match: filters1 },
                {
                    $lookup: {
                        from: "attractionactivities",
                        let: {
                            attraction: "$_id",
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ["$attraction", "$$attraction"],
                                            },
                                            { $eq: ["$isDeleted", false] },
                                        ],
                                    },
                                },
                            },

                            {
                                $addFields: {
                                    privateTransfer: {
                                        $arrayElemAt: ["$privateTransfers", 0],
                                    },
                                },
                            },
                            {
                                $addFields: {
                                    lowPrice: {
                                        $cond: {
                                            if: {
                                                $eq: ["$activityType", "normal"],
                                            },
                                            then: "$adultPrice",
                                            else: {
                                                $cond: {
                                                    if: {
                                                        $eq: ["$isSharedTransferAvailable", true],
                                                    },
                                                    then: "$sharedTransferPrice",
                                                    else: "$privateTransfer.price",
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            {
                                $sort: { lowPrice: 1 },
                            },
                        ],
                        as: "activities",
                    },
                },
                {
                    $lookup: {
                        from: "b2bmarkupprofiles",
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: [
                                            "$resellerId",
                                            {
                                                $cond: {
                                                    if: {
                                                        $eq: [req.reseller.role, "sub-agent"],
                                                    },
                                                    then: Types.ObjectId(req.reseller?.referredBy),
                                                    else: Types.ObjectId(req.reseller?._id),
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "b2bMarkupProfile",
                    },
                },
                {
                    $set: {
                        b2bMarkupProfile: { $arrayElemAt: ["$b2bMarkupProfile", 0] },
                    },
                },

                {
                    $lookup: {
                        from: "b2bsubagentattractionmarkups",
                        let: {
                            attraction: "$_id",
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ["$resellerId", Types.ObjectId(subAgentId)],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "markupSubAgent",
                    },
                },
                {
                    $lookup: {
                        from: "destinations",
                        localField: "destination",
                        foreignField: "_id",
                        as: "destination",
                    },
                },
                {
                    $lookup: {
                        from: "attractioncategories",
                        localField: "category",
                        foreignField: "_id",
                        as: "category",
                    },
                },
                {
                    $set: {
                        destination: { $arrayElemAt: ["$destination", 0] },
                        category: { $arrayElemAt: ["$category", 0] },
                    },
                },
                { $skip: 0 },
                { $limit: 10 },
            ]);

            const attractionList = attractions.map((attraction) => {
                attraction.activities = attraction?.activities?.map((activity) => {
                    const subAgentMarkup = attraction?.markupSubAgent?.find(
                        (markup) => markup?.activityId?.toString() == activity?._id?.toString()
                    );

                    return {
                        _id: activity._id,
                        name: activity.name,

                        ...(subAgentMarkup !== undefined && { subAgentMarkup }),
                    };
                });

                return {
                    _id: attraction?._id,
                    activities: attraction?.activities,
                    title: attraction.title,
                };
            });

            res.status(200).json({
                attractionList,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
