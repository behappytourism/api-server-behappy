const { sendErrorResponse } = require("../../helpers");
const { isValidObjectId } = require("mongoose");
const { AttractionStandAlone, Attraction, AttractionActivity } = require("../../models");

module.exports = {
    getSingleStandAloneDetails: async (req, res) => {
        try {
            const { slug } = req.params;

            // const standAlone = await AttractionStandAlone.findOne({
            //     isActive: true,
            //     isDeleted: false,
            //     slug: slug,
            //     attraction: {
            //         $in: await Attraction.find().distinct("_id"),
            //     },
            // })
            //     .populate({
            //         path: "attraction",
            //         model: "Attraction",
            //         select: "_id title description images slug itineraryDescription durationType bookingType duration sections offDays startDate endDate availability ",
            //         populate: {
            //             path: "destination",
            //             model: "Destination",
            //         },
            //         populate: {
            //             path: "category",
            //             model: "AttractionCategory",
            //         },
            //     })
            //     .exec();

            // res.status(200).json(standAlone);

            const standAlone = await AttractionStandAlone.aggregate([
                {
                    $match: {
                        isActive: true,
                        isDeleted: false,
                        slug: slug,
                        attraction: {
                            $in: await Attraction.find().distinct("_id"),
                        },
                    },
                },
                {
                    $lookup: {
                        from: "attractions",
                        localField: "attraction",
                        foreignField: "_id",
                        as: "attractions",
                    },
                },
                {
                    $unwind: "$attractions",
                },
                {
                    $lookup: {
                        from: "attractioncategories",
                        localField: "attractions.category",
                        foreignField: "_id",
                        as: "category",
                    },
                },
                {
                    $lookup: {
                        from: "destinations",
                        localField: "attractions.destination",
                        foreignField: "_id",
                        as: "destination",
                    },
                },
                {
                    $lookup: {
                        from: "attractionreviews",
                        localField: "attractions._id",
                        foreignField: "attraction",
                        as: "reviews",
                    },
                },
                {
                    $set: {
                        averageRating: {
                            $cond: [
                                { $eq: ["$totalReviews", 0] },
                                0,
                                {
                                    $divide: ["$totalRating", "$totalReviews"],
                                },
                            ],
                        },
                    },
                },
                {
                    $lookup: {
                        from: "attractionactivities",
                        let: {
                            attraction: "$attractions._id",
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$attraction", "$$attraction"] },
                                            { $eq: ["$isDeleted", false] },
                                            { $eq: ["$isActive", true] },
                                        ],
                                    },
                                },
                            },
                            {
                                $lookup: {
                                    from: "b2cattractionmarkups",
                                    localField: "_id",
                                    foreignField: "activityId",
                                    as: "markup",
                                },
                            },
                            {
                                $set: {
                                    markup: { $arrayElemAt: ["$markup", 0] },
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
                                            then: "$adultCost",
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
                    $addFields: {
                        activities: {
                            $map: {
                                input: "$activities",
                                as: "activity",
                                in: {
                                    $cond: [
                                        {
                                            $eq: ["$$activity.activityType", "normal"],
                                        },
                                        {
                                            $mergeObjects: [
                                                "$$activity",
                                                {
                                                    $cond: [
                                                        {
                                                            $eq: [
                                                                "$$activity.markup.adultMarkupType",
                                                                "percentage",
                                                            ],
                                                        },
                                                        {
                                                            adultPrice: {
                                                                $sum: [
                                                                    "$$activity.adultCost",
                                                                    {
                                                                        $divide: [
                                                                            {
                                                                                $multiply: [
                                                                                    "$$activity.markup.adultMarkup",
                                                                                    "$$activity.adultCost",
                                                                                ],
                                                                            },
                                                                            100,
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                            lowPrice: {
                                                                $sum: [
                                                                    "$$activity.lowPrice",
                                                                    {
                                                                        $divide: [
                                                                            {
                                                                                $multiply: [
                                                                                    "$$activity.markup.adultMarkup",
                                                                                    "$$activity.lowPrice",
                                                                                ],
                                                                            },
                                                                            100,
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                        },
                                                        {
                                                            adultPrice: {
                                                                $sum: [
                                                                    "$$activity.adultCost",
                                                                    "$$activity.markup.adultMarkup",
                                                                ],
                                                            },
                                                            lowPrice: {
                                                                $sum: [
                                                                    "$$activity.lowPrice",
                                                                    "$$activity.markup.adultMarkup",
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },
                                                {
                                                    $cond: [
                                                        {
                                                            $eq: [
                                                                "$$activity.markup.childMarkupType",
                                                                "percentage",
                                                            ],
                                                        },
                                                        {
                                                            childPrice: {
                                                                $sum: [
                                                                    "$$activity.childCost",
                                                                    {
                                                                        $divide: [
                                                                            {
                                                                                $multiply: [
                                                                                    "$$activity.markup.childMarkup",
                                                                                    "$$activity.childCost",
                                                                                ],
                                                                            },
                                                                            100,
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                        },
                                                        {
                                                            childPrice: {
                                                                $sum: [
                                                                    "$$activity.childCost",
                                                                    "$$activity.markup.childMarkup",
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },
                                                {
                                                    $cond: [
                                                        {
                                                            $eq: [
                                                                "$$activity.markup.infantMarkupType",
                                                                "percentage",
                                                            ],
                                                        },
                                                        {
                                                            infantPrice: {
                                                                $cond: [
                                                                    {
                                                                        $eq: [
                                                                            "$$activity.infantCost",
                                                                            0,
                                                                        ],
                                                                    },
                                                                    0,
                                                                    {
                                                                        $sum: [
                                                                            "$$activity.infantCost",
                                                                            {
                                                                                $divide: [
                                                                                    {
                                                                                        $multiply: [
                                                                                            "$$activity.markup.childMarkup",
                                                                                            "$$activity.infantCost",
                                                                                        ],
                                                                                    },
                                                                                    100,
                                                                                ],
                                                                            },
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                        },
                                                        {
                                                            infantPrice: {
                                                                $cond: [
                                                                    {
                                                                        $or: [
                                                                            {
                                                                                $eq: [
                                                                                    "$$activity.infantCost",
                                                                                    0,
                                                                                ],
                                                                            },
                                                                            {
                                                                                $eq: [
                                                                                    "$$activity.infantCost",
                                                                                    null,
                                                                                ],
                                                                            },
                                                                        ],
                                                                    },
                                                                    0,
                                                                    {
                                                                        $sum: [
                                                                            "$$activity.infantCost",
                                                                            "$$activity.markup.childMarkup",
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                        {
                                            $cond: [
                                                {
                                                    $eq: [
                                                        "$$activity.markup.adultMarkupType",
                                                        "percentage",
                                                    ],
                                                },
                                                {
                                                    $mergeObjects: [
                                                        "$$activity",
                                                        {
                                                            sharedTransferPrice: {
                                                                $sum: [
                                                                    "$$activity.sharedTransferPrice",
                                                                    {
                                                                        $divide: [
                                                                            {
                                                                                $multiply: [
                                                                                    "$$activity.markup.adultMarkup",
                                                                                    "$$activity.sharedTransferPrice",
                                                                                ],
                                                                            },
                                                                            100,
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                            privateTransfers: {
                                                                $map: {
                                                                    input: "$$activity.privateTransfers",
                                                                    as: "transfers",
                                                                    in: {
                                                                        price: {
                                                                            $sum: [
                                                                                "$$transfers.cost",
                                                                                {
                                                                                    $divide: [
                                                                                        {
                                                                                            $multiply:
                                                                                                [
                                                                                                    "$$activity.markup.adultMarkup",
                                                                                                    "$$transfers.cost",
                                                                                                ],
                                                                                        },
                                                                                        100,
                                                                                    ],
                                                                                },
                                                                            ],
                                                                        },
                                                                    },
                                                                },
                                                            },
                                                            lowPrice: {
                                                                $sum: [
                                                                    "$$activity.lowPrice",
                                                                    {
                                                                        $divide: [
                                                                            {
                                                                                $multiply: [
                                                                                    "$$activity.markup.adultMarkup",
                                                                                    "$$activity.lowPrice",
                                                                                ],
                                                                            },
                                                                            100,
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },
                                                {
                                                    $mergeObjects: [
                                                        "$$activity",
                                                        {
                                                            sharedTransferPrice: {
                                                                $sum: [
                                                                    "$$activity.sharedTransferPrice",
                                                                    "$$activity.markup.adultMarkup",
                                                                ],
                                                            },
                                                            privateTransfers: {
                                                                $map: {
                                                                    input: "$$activity.privateTransfers",
                                                                    as: "transfers",
                                                                    in: {
                                                                        $mergeObjects: [
                                                                            "$$transfers",
                                                                            {
                                                                                price: {
                                                                                    $sum: [
                                                                                        "$$transfers.price",
                                                                                        "$$activity.markup.adultMarkup",
                                                                                    ],
                                                                                },
                                                                            },
                                                                        ],
                                                                    },
                                                                },
                                                            },
                                                            lowPrice: {
                                                                $sum: [
                                                                    "$$activity.lowPrice",
                                                                    "$$activity.markup.adultMarkup",
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        activities: {
                            $map: {
                                input: "$activities",
                                as: "activity",
                                in: {
                                    $cond: [
                                        {
                                            $eq: ["$$activity.activityType", "normal"],
                                        },
                                        {
                                            $cond: [
                                                {
                                                    $eq: ["$offerAmountType", "percentage"],
                                                },
                                                {
                                                    $mergeObjects: [
                                                        "$$activity",
                                                        {
                                                            adultlowPrice: {
                                                                $subtract: [
                                                                    "$$activity.adultPrice",
                                                                    {
                                                                        $divide: [
                                                                            {
                                                                                $multiply: [
                                                                                    "$offerAmount",
                                                                                    "$$activity.adultPrice",
                                                                                ],
                                                                            },
                                                                            100,
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                            childlowPrice: {
                                                                $subtract: [
                                                                    "$$activity.childPrice",
                                                                    {
                                                                        $divide: [
                                                                            {
                                                                                $multiply: [
                                                                                    "$offerAmount",
                                                                                    "$$activity.childPrice",
                                                                                ],
                                                                            },
                                                                            100,
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                            infantlowPrice: {
                                                                $cond: [
                                                                    {
                                                                        $or: [
                                                                            {
                                                                                $eq: [
                                                                                    "$$activity.infantPrice",
                                                                                    null,
                                                                                ],
                                                                            },
                                                                            {
                                                                                $eq: [
                                                                                    "$$activity.infantPrice",
                                                                                    0,
                                                                                ],
                                                                            },
                                                                        ],
                                                                    },
                                                                    0,
                                                                    {
                                                                        $subtract: [
                                                                            "$$activity.infantPrice",
                                                                            {
                                                                                $divide: [
                                                                                    {
                                                                                        $multiply: [
                                                                                            "$offerAmount",
                                                                                            "$$activity.infantPrice",
                                                                                        ],
                                                                                    },
                                                                                    100,
                                                                                ],
                                                                            },
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                            sharedTransferlowPrice: {
                                                                $subtract: [
                                                                    "$$activity.sharedTransferPrice",
                                                                    {
                                                                        $divide: [
                                                                            {
                                                                                $multiply: [
                                                                                    "$offerAmount",
                                                                                    "$$activity.sharedTransferPrice",
                                                                                ],
                                                                            },
                                                                            100,
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                            privateTransferslow: {
                                                                $map: {
                                                                    input: "$$activity.privateTransfers",
                                                                    as: "transfers",
                                                                    in: {
                                                                        $mergeObjects: [
                                                                            "$$transfers",
                                                                            {
                                                                                price: {
                                                                                    $subtract: [
                                                                                        "$$transfers.price",
                                                                                        {
                                                                                            $divide:
                                                                                                [
                                                                                                    {
                                                                                                        $multiply:
                                                                                                            [
                                                                                                                "$offerAmount",
                                                                                                                "$$transfers.price",
                                                                                                            ],
                                                                                                    },
                                                                                                    100,
                                                                                                ],
                                                                                        },
                                                                                    ],
                                                                                },
                                                                            },
                                                                        ],
                                                                    },
                                                                },
                                                            },
                                                            offerlowPrice: {
                                                                $subtract: [
                                                                    "$$activity.lowPrice",
                                                                    {
                                                                        $divide: [
                                                                            {
                                                                                $multiply: [
                                                                                    "$offerAmount",
                                                                                    "$$activity.lowPrice",
                                                                                ],
                                                                            },
                                                                            100,
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },
                                                {
                                                    $mergeObjects: [
                                                        "$$activity",
                                                        {
                                                            adultlowPrice: {
                                                                $subtract: [
                                                                    "$$activity.adultPrice",
                                                                    {
                                                                        $ifNull: [
                                                                            "$offerAmount",
                                                                            0,
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                            childlowPrice: {
                                                                $subtract: [
                                                                    "$$activity.childPrice",
                                                                    {
                                                                        $ifNull: [
                                                                            "$offerAmount",
                                                                            0,
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                            infantlowPrice: {
                                                                $cond: [
                                                                    {
                                                                        $or: [
                                                                            {
                                                                                $eq: [
                                                                                    "$$activity.infantPrice",
                                                                                    null,
                                                                                ],
                                                                            },
                                                                            {
                                                                                $eq: [
                                                                                    "$$activity.infantPrice",
                                                                                    0,
                                                                                ],
                                                                            },
                                                                        ],
                                                                    },
                                                                    0,
                                                                    {
                                                                        $subtract: [
                                                                            "$$activity.infantPrice",
                                                                            {
                                                                                $ifNull: [
                                                                                    "$offerAmount",
                                                                                    0,
                                                                                ],
                                                                            },
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                            sharedTransferlowPrice: {
                                                                $subtract: [
                                                                    "$$activity.sharedTransferPrice",
                                                                    "$offerAmount",
                                                                ],
                                                            },
                                                            privateTransferslow: {
                                                                $map: {
                                                                    input: "$$activity.privateTransfers",
                                                                    as: "transfers",
                                                                    in: {
                                                                        $mergeObjects: [
                                                                            "$$transfers",
                                                                            {
                                                                                price: {
                                                                                    $subtract: [
                                                                                        "$$transfers.price",
                                                                                        "$offerAmount",
                                                                                    ],
                                                                                },
                                                                            },
                                                                        ],
                                                                    },
                                                                },
                                                            },
                                                            offerlowPrice: {
                                                                $subtract: [
                                                                    "$$activity.lowPrice",
                                                                    "$offerAmount",
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                        "$$activity",
                                    ],
                                },
                            },
                        },
                    },
                },
                {
                    $group: {
                        _id: "$_id",
                        title: { $first: "$title" },
                        description: { $first: "$description" },
                        images: { $first: "$images" },
                        itineraryDescription: { $first: "$itineraryDescription" },
                        attractions: {
                            $push: {
                                _id: "$attractions._id",
                                title: "$attractions.title",
                                images: "$attractions.images",
                                itineraryDescription: "$attractions.itineraryDescription",
                                bookingType: "$attractions.bookingType",
                                slug: "$attractions.slug",
                                lowestPriceActivity: {
                                    $min: "$activities.lowPrice",
                                },
                                category: "$category",
                                destination: "$destination",
                                reviews: "$reviews",
                                totalReviews: { $sum: { $size: "$reviews" } },
                                averageRating: { $avg: "$reviews.rating" },
                                // activities: "$activities",
                            },
                        },
                    },
                },
            ]);

            res.status(200).json(standAlone[0]);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },
};
