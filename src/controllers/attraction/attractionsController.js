const { isValidObjectId } = require("mongoose");
const { Types } = require("mongoose");

const { getTimeSlotWithRate } = require("../../b2b/helpers");
const { getTicketCountCache } = require("../../config/cache");
const { sendErrorResponse } = require("../../helpers");
const { updateTicketCountHelper } = require("../../helpers/attraction/attractionTicketHelper");
const {
    Attraction,
    Destination,
    AttractionActivity,
    B2CAttractionMarkup,
    AffiliateUser,
    AffiliateClickHistory,
    B2cMarkupProfile,
    AttractionCategory,
} = require("../../models");
const { timeSlotSchema } = require("../../validations/timeSlot.schema");

module.exports = {
    getSingleAttraction: async (req, res) => {
        try {
            const { slug } = req.params;
            const { affiliateCode } = req.query;

            // if (!isValidObjectId(id)) {
            //     return sendErrorResponse(res, 400, "Invalid attraction id");
            // }

            let affilateUser = await AffiliateUser.findOne({ affiliateCode, isB2cActive: true });

            const attraction = await Attraction.aggregate([
                {
                    $match: {
                        // _id: Types.ObjectId(id),
                        slug: slug,
                        isDeleted: false,
                        isB2cActive: true,
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
                    $lookup: {
                        from: "attractionreviews",
                        localField: "_id",
                        foreignField: "attraction",
                        as: "reviews",
                    },
                },
                // {
                //     $lookup: {
                //         from: "b2cattractionmarkups",
                //         localField: "_id",
                //         foreignField: "attraction",
                //         as: "markup",
                //     },
                // },
                {
                    $set: {
                        destination: { $arrayElemAt: ["$destination", 0] },
                        category: { $arrayElemAt: ["$category", 0] },
                        totalRating: {
                            $sum: {
                                $map: {
                                    input: "$reviews",
                                    in: "$$this.rating",
                                },
                            },
                        },
                        totalReviews: {
                            $size: "$reviews",
                        },
                        markup: { $arrayElemAt: ["$markup", 0] },
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
                                            { $eq: ["$isB2cActive", true] },
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

                                                // "$$activity",
                                            ],
                                        },
                                        {
                                            $cond: [
                                                {
                                                    $eq: [
                                                        "$activity.markup.adultMarkup",
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
                                                                                    "$offerAmount",
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

                                                            offerlowPrice: {
                                                                $sum: [
                                                                    "$$activity.lowPrice",
                                                                    {
                                                                        $ifNull: [
                                                                            "$offerAmount",
                                                                            0,
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
                                                    $eq: ["$offerAmountType", "percentage"],
                                                },
                                                {
                                                    $mergeObjects: [
                                                        "$$activity",
                                                        {
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
                                                                        price: {
                                                                            $subtract: [
                                                                                "$$transfers.price",
                                                                                {
                                                                                    $divide: [
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
                                    $mergeObjects: [
                                        "$$activity",
                                        {
                                            destination: "$destination",
                                            attractionSlug: "$slug",
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
                {
                    $project: {
                        totalReviews: 0,
                        activities: {
                            privateTransfer: 0,
                            adultCost: 0,
                            infantCost: 0,
                            childCost: 0,
                            sharedTransferCost: 0,
                            b2bPromoAmountChild: 0,
                            b2bPromoAmountAdult: 0,
                            b2bPromoCode: 0,
                            isB2bPromoCode: 0,
                        },
                    },
                },
            ]);

            if (!attraction || attraction?.length < 1) {
                return sendErrorResponse(res, 404, "Attraction not found");
            }

            if (affilateUser) {
                const affilateClick = new AffiliateClickHistory({
                    user: affilateUser.user,
                    clickType: "attraction",
                    attraction: attraction[0]._id,
                });

                affilateUser.totalClicks += 1;
                await affilateClick.save();
                await affilateUser.save();

                res.cookie("affiliateCode", affiliateCode, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // Set the cookie for 30 days
            }

            const attractionData = attraction[0];
            attractionData.activities = await Promise.all(
                attractionData.activities.map(async (activity) => {
                    let adultTicketCount = 0;
                    let childTicketCount = 0;
                    let infantTicketCount = 0;

                    // let getTicketsCount = await getTicketCountCache({
                    //     attraction: attractionData._id,
                    //     activity: activity._id,
                    // });

                    // if (!getTicketsCount) {
                    const { adultCount, childCount, infantCount } = await updateTicketCountHelper({
                        attraction: attractionData._id,
                        activity: activity._id,
                        date: new Date(),
                    });

                    adultTicketCount = adultCount;
                    childTicketCount = childCount;
                    infantTicketCount = infantCount;
                    // } else {
                    //     adultTicketCount = getTicketsCount.adultCount;
                    //     childTicketCount = getTicketsCount.childCount;
                    //     infantTicketCount = getTicketsCount.infantCount;
                    // }

                    return {
                        ...activity,
                        adultTicketCount,
                        childTicketCount,
                        infantTicketCount,
                    };
                })
            );

            res.status(200).json(attractionData);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getAllAttractions: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                destination,
                categories,
                ratings,
                priceFrom,
                priceTo,
                durations,
                search,
                isCombo,
                isOffer,
                isPromoCode,
            } = req.query;

            const appliedFilters = {
                destination: destination || "",
                categories: [],
                ratings: [],
                priceFrom: priceFrom || "",
                priceTo: priceTo || "",
                durations: [],
                search: search || "",
            };

            const filters1 = { isDeleted: false, isB2cActive: true };
            const filters2 = {};

            let dest = {};

            const parsedCategories = await Promise.all(
                (categories ? JSON.parse(categories) : [])
                    .filter((category) => category)
                    .map(async (category) => {
                        const cat = await AttractionCategory.findOne({
                            slug: category?.toLowerCase(),
                        }).lean();
                        return Types.ObjectId(cat._id);
                    })
            );

            if (parsedCategories && parsedCategories?.length > 0) {
                filters1.category = { $in: parsedCategories };
            }

            console.log("call reached");

            if (destination && destination !== "") {
                dest = await Destination.findOne({
                    slug: destination?.toLowerCase(),
                }).lean();

                if (dest) {
                    filters1.destination = dest?._id;
                } else {
                    return res.status(200).json({
                        destinations: [],
                        skip: Number(skip),
                        limit: Number(limit),
                    });
                }
            }

            const parsedRatings = ratings ? JSON.parse(ratings) : [];
            if (parsedRatings && parsedRatings?.length > 0) {
                filters2.$or =
                    parsedRatings?.map((rating) => {
                        return {
                            $and: [
                                { averageRating: { $gte: Number(rating) } },
                                { averageRating: { $lt: Number(rating) + 1 } },
                            ],
                        };
                    }) || [];
            }

            if (search && search !== "") {
                filters1.title = { $regex: search, $options: "i" };
            }

            if (isOffer && isOffer !== "") {
                filters1.isOffer = isOffer === "true";
            }

            if (isCombo && isCombo !== "") {
                filters1.isCombo = isCombo === "true";
            }

            const parsedDurations = durations ? JSON.parse(durations) : [];
            if (parsedDurations && parsedDurations?.length > 0) {
                filters1.$or =
                    parsedDurations?.map((duration) => {
                        const tempDuration = duration?.split("-");
                        return {
                            $and: [
                                { durationInSeconds: { $gte: Number(tempDuration[0]) || 0 } },
                                { durationInSeconds: { $lt: Number(tempDuration[1]) || 0 } },
                            ],
                        };
                    }) || [];
            }

            if (priceFrom && priceFrom !== "" && priceTo && priceTo !== "") {
                filters2.$and = [
                    { "activity.lowPrice": { $gte: Number(priceFrom) } },
                    { "activity.lowPrice": { $lte: Number(priceTo) } },
                ];
            } else if (priceFrom && priceFrom !== "") {
                filters2["activity.lowPrice"] = { $gte: Number(priceFrom) };
            } else if (priceTo && priceTo !== "") {
                filters2["activity.lowPrice"] = { $lte: Number(priceTo) };
            }

            if (isPromoCode) {
                filters2["isPromoCode"] = isPromoCode === "true";
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
                                            { $eq: ["$isB2cActive", true] },
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
                            {
                                $limit: 1,
                            },
                        ],
                        as: "activities",
                    },
                },
                {
                    $addFields: {
                        isPromoCode: {
                            $anyElementTrue: {
                                $map: {
                                    input: "$activities",
                                    as: "activity",
                                    in: "$$activity.isPromoCode",
                                },
                            },
                        },
                    },
                },
                {
                    $lookup: {
                        from: "attractionreviews",
                        localField: "_id",
                        foreignField: "attraction",
                        as: "reviews",
                    },
                },
                {
                    $lookup: {
                        from: "b2cattractionmarkups",
                        localField: "_id",
                        foreignField: "attraction",
                        as: "markup",
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
                        activity: { $arrayElemAt: ["$activities", 0] },
                        markup: { $arrayElemAt: ["$markup", 0] },
                        destination: { $arrayElemAt: ["$destination", 0] },
                        category: { $arrayElemAt: ["$category", 0] },
                        totalReviews: {
                            $size: "$reviews",
                        },
                        totalRating: {
                            $sum: {
                                $map: {
                                    input: "$reviews",
                                    in: "$$this.rating",
                                },
                            },
                        },
                    },
                },
                {
                    $sort: {
                        // isPromoCode: -1,
                        displayOrder: -1,
                    },
                },
                {
                    $project: {
                        title: 1,
                        destination: 1,
                        slug: 1,
                        category: {
                            categoryName: 1,
                            slug: 1,
                            _id: 1,
                        },
                        images: 1,
                        bookingType: 1,
                        activity: {
                            lowPrice: {
                                $cond: [
                                    {
                                        $eq: ["$activity.markup.adultMarkupType", "percentage"],
                                    },
                                    {
                                        $sum: [
                                            "$activity.lowPrice",
                                            {
                                                $divide: [
                                                    {
                                                        $multiply: [
                                                            "$activity.markup.adultMarkup",
                                                            "$activity.lowPrice",
                                                        ],
                                                    },
                                                    100,
                                                ],
                                            },
                                        ],
                                    },
                                    {
                                        $sum: [
                                            "$activity.lowPrice",
                                            "$activity.markup.adultMarkup",
                                        ],
                                    },
                                ],
                            },
                            activityType: 1,
                            isSharedTransferAvailable: 1,
                            isPrivateTransferAvailable: 1,
                            // privateTransfer: 1,
                            // markup: 1,
                            promoAmountAdult: 1,
                        },
                        duration: 1,
                        durationType: 1,
                        totalReviews: 1,
                        averageRating: {
                            $cond: [
                                { $eq: ["$totalReviews", 0] },
                                0,
                                {
                                    $divide: ["$totalRating", "$totalReviews"],
                                },
                            ],
                        },
                        cancellationType: 1,
                        cancelBeforeTime: 1,
                        cancellationFee: 1,
                        isCombo: 1,
                        isOffer: 1,
                        offerAmountType: 1,
                        offerAmount: 1,
                        isPromoCode: 1,
                    },
                },
                {
                    $match: filters2,
                },
                {
                    $group: {
                        _id: null,
                        totalAttractions: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalAttractions: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            appliedFilters.categories = parsedCategories;
            appliedFilters.ratings = parsedRatings;
            appliedFilters.durations = parsedDurations;

            res.status(200).json({
                totalAttractions: attractions[0]?.totalAttractions || 0,
                skip: Number(skip),
                limit: Number(limit),
                appliedFilters,
                attractions: attractions[0],
                destination: dest,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getTimeSlot: async (req, res) => {
        try {
            const { productId, productCode, timeSlotDate } = req.body;

            const { _, error } = timeSlotSchema.validate(req.body);

            let activity = await AttractionActivity.findOne({
                isDeleted: false,
                productId,
                productCode,
            });

            if (!activity) {
                return sendErrorResponse(res, 400, "activity not found");
            }

            let markup = await B2CAttractionMarkup.findOne({ activityId: activity._id });

            let timeSlotsRate = await getTimeSlotWithRate(productId, productCode, timeSlotDate);

            if (timeSlotsRate?.length < 1) {
                return sendErrorResponse(res, 400, "slot not available now");
            }

            let timeSlots = timeSlotsRate?.map((timeSlot) => {
                let { AdultPrice, ChildPrice } = timeSlot;

                AdultPrice = Number(AdultPrice);
                ChildPrice = Number(ChildPrice);

                if (markup) {
                    if (markup?.adultMarkupType === "percentage") {
                        const markupAmount = markup?.adultMarkup / 100;
                        AdultPrice *= 1 + Number(markupAmount);
                    } else if (markup?.adultMarkupType === "flat") {
                        AdultPrice += Number(markup?.adultMarkup);
                    }

                    if (markup.childMarkupType === "percentage") {
                        const markupAmount = markup?.childMarkup / 100;

                        if (ChildPrice !== null && ChildPrice !== 0) {
                            ChildPrice *= 1 + Number(markupAmount);
                        }
                    } else if (markup?.childMarkupType === "flat") {
                        if (ChildPrice !== null && ChildPrice !== 0) {
                            ChildPrice += Number(markup?.childMarkup);
                        }
                    }
                }

                return {
                    ...timeSlot,
                    AdultPrice,
                    ChildPrice,
                };
            });
            res.status(200).json(timeSlots);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
