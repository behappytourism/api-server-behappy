const { isValidObjectId, Types } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { Attraction, AttractionActivity } = require("../../../models");
const { B2BClientAttractionMarkup } = require("../../models");
const {
    b2bClientAttractionMarkupSchema,
} = require("../../validations/b2bClientAttractionMarkupSchema");

module.exports = {
    upsertB2bClientAttractionMarkup: async (req, res) => {
        try {
            const { markupType, markup, activityId } = req.body;

            const { _, error } = b2bClientAttractionMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "Invalid activityId ");
            }

            if (markup < 0) {
                return sendErrorResponse(res, 400, "Markup should be greater than zero");
            }

            const activityDetail = await AttractionActivity.findOne({
                _id: activityId,
                isDeleted: false,
            });

            if (!activityDetail) {
                return sendErrorResponse(res, 400, "Attraction Not Found");
            }

            const b2bClientAttractionMarkups = await B2BClientAttractionMarkup.findOneAndUpdate(
                {
                    activityId,
                    resellerId: req.reseller._id,
                },
                {
                    activityId,
                    markupType,
                    markup,
                    resellerId: req.reseller._id,
                },
                { upsert: true, new: true, runValidators: true }
            );

            console.log(b2bClientAttractionMarkups, "b2bClientAttractionMarkups");

            let tempObj = Object(b2bClientAttractionMarkups);
            tempObj.activity = {
                _id: activityDetail?._id,
            };

            res.status(200).json(tempObj);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteB2bClientAttractionMarkup: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid markup id");
            }

            const b2bClientAttractionMarkups = await B2BClientAttractionMarkup.findByIdAndDelete(
                id
            );

            if (!b2bClientAttractionMarkups) {
                return sendErrorResponse(res, 404, "B2b Attraction markup not found");
            }

            res.status(200).json({
                message: "b2b attraction markup deleted successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllAttractions: async (req, res) => {
        try {
            const { skip = 0, limit = 10, search } = req.query;

            const filters1 = { isDeleted: false, isActive: true };

            if (search && search !== "") {
                filters1.title = { $regex: search, $options: "i" };
            }

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
                        from: "b2bclientattractionmarkups",
                        let: {
                            attraction: "$_id",
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: [
                                                    "$resellerId",
                                                    Types.ObjectId(req.reseller._id),
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "markupClient",
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
                    const clientMarkup = attraction?.markupClient?.find(
                        (markup) => markup?.activityId?.toString() == activity._id?.toString()
                    );

                    return {
                        _id: activity._id,
                        name: activity.name,

                        ...(clientMarkup !== undefined && { clientMarkup }),
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
