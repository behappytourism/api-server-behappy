const { isValidObjectId, Types } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { getTimeSlot, getTimeSlotWithRate } = require("../../helpers");
const {
    Attraction,
    Destination,
    AttractionTicket,
    AttractionActivity,
    Banner,
    B2bBanner,
} = require("../../../models");
const { b2bTimeSlotSchema } = require("../../validations/b2bTimeSlot.schema");
const {
    B2BClientAttractionMarkup,
    B2BSubAgentAttractionMarkup,
    B2BMarkupProfile,
} = require("../../models");
const { getTicketCountCache, updateTicketCountCache } = require("../../../config/cache");
const { updateTicketCountHelper } = require("../../../helpers/attraction/attractionTicketHelper");

module.exports = {
    getSingleAttraction: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid attraction id");
            }

            const attraction = await Attraction.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(id),
                        isDeleted: false,
                        isB2bActive: true,
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
                                            { $eq: ["$isB2bActive", true] },
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
                                            then: {
                                                $cond: {
                                                    if: {
                                                        $eq: ["$base", "hourly"],
                                                    },
                                                    then: "$hourlyCost",
                                                    else: "$adultCost",
                                                },
                                            },
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
                        from: "attractionreviews",
                        localField: "_id",
                        foreignField: "attraction",
                        as: "reviews",
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
                                                    Types.ObjectId(req?.reseller?._id),
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
                                                $eq: [
                                                    "$resellerId",
                                                    Types.ObjectId(req?.reseller?._id),
                                                ],
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
                        totalReviews: {
                            $size: "$reviews",
                        },
                    },
                },
                {
                    $set: {
                        totalRating: {
                            $cond: {
                                if: {
                                    $gt: ["$totalReviews", 0],
                                },
                                then: {
                                    $divide: [
                                        {
                                            $sum: {
                                                $map: {
                                                    input: "$reviews",
                                                    in: "$$this.rating",
                                                },
                                            },
                                        },
                                        "$totalReviews",
                                    ],
                                },
                                else: 0,
                            },
                        },
                    },
                },
                {
                    $project: {
                        reviews: 0,
                        activities: {
                            isPromoCode: 0,
                            promoCode: 0,
                            promoAmountAdult: 0,
                            promoAmountChild: 0,
                        },
                    },
                },
            ]);

            if (!attraction || attraction?.length < 1) {
                return sendErrorResponse(res, 404, "Attraction not found");
            }

            const attractionData = attraction[0];
            attractionData.activities = await Promise.all(
                attractionData.activities.map(async (activity) => {
                    let {
                        adultCost,
                        childCost,
                        infantCost,
                        hourlyCost,
                        sharedTransferPrice,
                        privateTransfer,
                        privateTransfers,
                        isB2bPromoCode,
                        b2bPromoAmountAdult,
                    } = activity;

                    let adultTicketCount = 0;
                    let childTicketCount = 0;
                    let infantTicketCount = 0;
                    console.time("fetching");

                    // let getTicketsCount = await getTicketCountCache({
                    //     attraction: attractionData._id,
                    //     activity: activity._id,
                    // });

                    console.timeEnd("filtered");

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

                    const markup = attractionData?.b2bMarkupProfile?.activities.find(
                        (markup) => markup?.activity?.toString() === activity?._id.toString()
                    );

                    // console.log(markup, attractionData);
                    if (markup) {
                        if (markup.markupType === "percentage") {
                            const markupAmount = markup.markup / 100;
                            if (activity.base === "hourly") {
                                hourlyCost *= 1 + markupAmount;
                            } else {
                                adultCost *= 1 + markupAmount;
                                if (childCost) {
                                    childCost *= 1 + markupAmount;
                                }
                                if (infantCost) {
                                    infantCost *= 1 + markupAmount;
                                }
                                if (activity.activityType == "transfer") {
                                    if (activity.isSharedTransferAvailable == true) {
                                        sharedTransferPrice *= 1 + markupAmount;
                                    }
                                    if (activity.isPrivateTransferAvailable == true) {
                                        privateTransfer.price *= 1 + markupAmount;

                                        privateTransfers = privateTransfers.map((pvtTranf) => {
                                            return {
                                                ...pvtTranf,
                                                price:
                                                    pvtTranf.price + pvtTranf.price * markupAmount,
                                            };
                                        });
                                    }
                                }
                            }
                        } else if (markup.markupType === "flat") {
                            if (activity.base === "hourly") {
                                hourlyCost *= 1 + markup?.markup;
                            } else {
                                adultCost += markup?.markup;
                                if (childCost) {
                                    childCost += markup.markup;
                                }
                                if (infantCost) {
                                    infantCost += markup.markup;
                                }

                                if (activity.activityType == "transfer") {
                                    if (activity.isSharedTransferAvailable == true) {
                                        sharedTransferPrice += markup.markup;
                                    }
                                    if (activity.isPrivateTransferAvailable == true) {
                                        privateTransfer.price += markup.markup;

                                        privateTransfers = privateTransfers?.map((pvtTranf) => {
                                            return {
                                                ...pvtTranf,
                                                price: pvtTranf?.price + markup?.markup,
                                            };
                                        });
                                    }
                                }
                            }
                        }
                    }

                    if (req.reseller.role == "sub-agent") {
                        const subAgentMarkup = attractionData?.markupSubAgent.find(
                            (markup) => markup?.activityId?.toString() == activity._id?.toString()
                        );

                        if (subAgentMarkup) {
                            if (subAgentMarkup.markupType === "percentage") {
                                const markupAmount = subAgentMarkup.markup / 100;
                                if (activity.base === "hourly") {
                                    hourlyCost *= 1 + markupAmount;
                                } else {
                                    adultCost *= 1 + markupAmount;
                                    if (childCost) {
                                        childCost *= 1 + markupAmount;
                                    }
                                    if (infantCost) {
                                        infantCost *= 1 + markupAmount;
                                    }

                                    if (activity.activityType == "transfer") {
                                        if (activity.isSharedTransferAvailable == true) {
                                            sharedTransferPrice *= 1 + markupAmount;
                                        }
                                        if (activity.isPrivateTransferAvailable == true) {
                                            privateTransfer.price *= 1 + markupAmount;

                                            privateTransfers = privateTransfers.map((pvtTranf) => {
                                                return {
                                                    ...pvtTranf,
                                                    price:
                                                        pvtTranf.price +
                                                        pvtTranf.price * markupAmount,
                                                };
                                            });
                                        }
                                    }
                                }
                            } else if (subAgentMarkup.markupType === "flat") {
                                if (activity.base === "hourly") {
                                    hourlyCost *= 1 + subAgentMarkup.markup;
                                } else {
                                    adultCost += subAgentMarkup.markup;
                                    if (childCost) {
                                        childCost += subAgentMarkup.markup;
                                    }
                                    if (infantCost) {
                                        infantCost += subAgentMarkup.markup;
                                    }

                                    if (activity.activityType == "transfer") {
                                        if (activity.isSharedTransferAvailable == true) {
                                            sharedTransferPrice += subAgentMarkup.markup;
                                        }
                                        if (activity.isPrivateTransferAvailable == true) {
                                            privateTransfer.price += subAgentMarkup.markup;

                                            privateTransfers = privateTransfers.map((pvtTranf) => {
                                                return {
                                                    ...pvtTranf,
                                                    price: pvtTranf.price + subAgentMarkup.markup,
                                                };
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }

                    const clientMarkup = attractionData?.markupClient.find(
                        (markup) => markup?.activityId?.toString() == activity._id?.toString()
                    );

                    if (clientMarkup) {
                        if (clientMarkup.markupType === "percentage") {
                            const markupAmount = clientMarkup.markup / 100;
                            if (activity.base === "hourly") {
                                hourlyCost *= 1 + markupAmount;
                            } else {
                                adultCost *= 1 + markupAmount;
                                if (childCost) {
                                    childCost *= 1 + markupAmount;
                                }
                                if (infantCost) {
                                    infantCost *= 1 + markupAmount;
                                }
                                if (activity.activityType == "transfer") {
                                    if (activity.isSharedTransferAvailable == true) {
                                        sharedTransferPrice *= 1 + markupAmount;
                                    }
                                    if (activity.isPrivateTransferAvailable == true) {
                                        privateTransfer.price *= 1 + markupAmount;
                                        privateTransfers = privateTransfers.map((pvtTranf) => {
                                            return {
                                                ...pvtTranf,
                                                price:
                                                    pvtTranf.price + pvtTranf.price * markupAmount,
                                            };
                                        });
                                    }
                                }
                            }
                        } else if (clientMarkup.markupType === "flat") {
                            if (activity.base === "hourly") {
                                hourlyCost *= 1 + clientMarkup?.markup;
                            } else {
                                adultCost += clientMarkup.markup;
                                if (childCost) {
                                    childCost += clientMarkup.markup;
                                }
                                if (infantCost) {
                                    infantCost += clientMarkup.markup;
                                }
                                if (activity.activityType == "transfer") {
                                    if (activity?.isSharedTransferAvailable == true) {
                                        sharedTransferPrice += clientMarkup.markup;
                                    }
                                    if (activity?.isPrivateTransferAvailable == true) {
                                        privateTransfer.price += clientMarkup?.markup;
                                        privateTransfers = privateTransfers?.map((pvtTranf) => {
                                            return {
                                                ...pvtTranf,
                                                price: pvtTranf.price + clientMarkup.markup,
                                            };
                                        });
                                    }
                                }
                            }
                        }
                    }

                    let lowPrice;
                    if (isB2bPromoCode) {
                        if (activity.activityType === "normal") {
                            if (activity.base === "hourly") {
                                lowPrice = hourlyCost;
                            } else {
                                lowPrice = Number(adultCost + b2bPromoAmountAdult);
                            }
                        } else if (activity.activityType === "transfer") {
                            if (activity.isSharedTransferAvailable === true) {
                                lowPrice = Number(sharedTransferPrice + b2bPromoAmountAdult);
                            } else {
                                lowPrice = Number(privateTransfer.price + b2bPromoAmountAdult);
                            }
                        }
                    } else {
                        if (activity.activityType === "normal") {
                            if (activity.base === "hourly") {
                                lowPrice = hourlyCost;
                            } else {
                                lowPrice = adultCost;
                            }
                        } else if (activity.activityType === "transfer") {
                            if (activity.isSharedTransferAvailable === true) {
                                lowPrice = sharedTransferPrice;
                            } else {
                                lowPrice = privateTransfer.price;
                            }
                        }
                    }

                    return {
                        ...activity,
                        lowPrice,
                        adultPrice: adultCost || 0,
                        childPrice: childCost || 0,
                        infantPrice: infantCost || 0,
                        hourlyPrice: hourlyCost || 0,
                        sharedTransferPrice: sharedTransferPrice || 0,
                        privateTransfer: privateTransfer,
                        privateTransfers,
                        adultTicketCount,
                        childTicketCount,
                        infantTicketCount,
                    };
                })
            );

            await attractionData.activities.sort((activityA, activityB) => {
                return activityA.lowPrice - activityB.lowPrice;
            });

            const lowPrice = await attractionData.activities.reduce((minPrice, activity) => {
                let price = 0;

                if (activity.activityType == "normal") {
                    price = activity.lowPrice || 0;
                } else {
                    if (activity.isSharedTransferAvailable == true) {
                        price = activity.sharedTransferPrice;
                    } else {
                        price = activity.privateTransfer.price;
                    }
                }

                return Math.min(minPrice, price);
            }, Infinity);

            attractionData.lowPrice = lowPrice;

            delete attractionData.specialMarkup;
            delete attractionData.markupClient;
            delete attractionData.markupSubAgent;

            res.status(200).json({
                attraction: attractionData,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getAllAttractions: async (req, res) => {
        try {
            const { skip = 0, limit = 10, destination, category, search } = req.query;

            const filters1 = { isDeleted: false, isB2bActive: true };

            if (category && category !== "") {
                if (!isValidObjectId(category)) {
                    return sendErrorResponse(res, 400, "Invalid category id");
                }

                filters1.category = Types.ObjectId(category);
            }

            if (destination && destination !== "") {
                const dest = await Destination.findOne({
                    name: destination?.toLowerCase(),
                });

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
                                            then: {
                                                $cond: {
                                                    if: {
                                                        $eq: ["$base", "hourly"],
                                                    },
                                                    then: "$hourlyCost",
                                                    else: "$adultPrice",
                                                },
                                            },
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
                        isPromoCode: {
                            $anyElementTrue: {
                                $map: {
                                    input: "$activities",
                                    as: "activity",
                                    in: "$$activity.isB2bPromoCode",
                                },
                            },
                        },
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
                        from: "attractionreviews",
                        localField: "_id",
                        foreignField: "attraction",
                        as: "reviews",
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
                                                $eq: [
                                                    "$resellerId",
                                                    Types.ObjectId(req?.reseller?._id),
                                                ],
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
                        totalReviews: {
                            $size: "$reviews",
                        },
                    },
                },
                {
                    $set: {
                        totalRating: {
                            $cond: {
                                if: {
                                    $gt: ["$totalReviews", 0],
                                },
                                then: {
                                    $divide: [
                                        {
                                            $sum: {
                                                $map: {
                                                    input: "$reviews",
                                                    in: "$$this.rating",
                                                },
                                            },
                                        },
                                        "$totalReviews",
                                    ],
                                },
                                else: 0,
                            },
                        },
                    },
                },
                {
                    $sort: {
                        isPromoCode: -1,
                    },
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

            const attractionList = attractions[0]?.data.map((attraction) => {
                const {
                    _id,
                    title,
                    durationType,
                    duration,
                    totalRating,
                    totalReviews,
                    images,
                    destination,
                    category,
                    bookingType,
                    isPromoCode,
                } = attraction;

                attraction.activities = attraction.activities.map((activity, ind) => {
                    let {
                        adultCost,
                        childCost,
                        infantCost,
                        hourlyCost,
                        sharedTransferPrice,
                        privateTransfer,
                        privateTransfers,
                        isB2bPromoCode,
                        b2bPromoAmountAdult,
                    } = activity;

                    const markup = attraction?.b2bMarkupProfile?.activities.find(
                        (markup) => markup?.activity?.toString() === activity?._id.toString()
                    );

                    if (markup) {
                        if (markup.markupType === "percentage") {
                            const markupAmount = markup.markup / 100;
                            if (activity.base === "hourly") {
                                hourlyCost *= 1 + markupAmount;
                            } else {
                                adultCost *= 1 + markupAmount;
                                if (childCost) {
                                    childCost *= 1 + markupAmount;
                                }
                                if (infantCost) {
                                    infantCost *= 1 + markupAmount;
                                }
                                if (activity.activityType == "transfer") {
                                    if (activity.isSharedTransferAvailable == true) {
                                        sharedTransferPrice *= 1 + markupAmount;
                                    }
                                    if (activity.isPrivateTransferAvailable == true) {
                                        privateTransfer.price *= 1 + markupAmount;

                                        privateTransfers = privateTransfers.map((pvtTranf) => {
                                            return {
                                                ...pvtTranf,
                                                price:
                                                    pvtTranf.price + pvtTranf.price * markupAmount,
                                            };
                                        });
                                    }
                                }
                            }
                        } else if (markup.markupType === "flat") {
                            if (activity.base === "hourly") {
                                hourlyCost *= 1 + markup.markup;
                            } else {
                                adultCost += markup?.markup;
                                if (childCost) {
                                    childCost += markup.markup;
                                }
                                if (infantCost) {
                                    infantCost += markup.markup;
                                }

                                if (activity.activityType == "transfer") {
                                    if (activity.isSharedTransferAvailable == true) {
                                        sharedTransferPrice += markup.markup;
                                    }
                                    if (activity.isPrivateTransferAvailable == true) {
                                        privateTransfer.price += markup.markup;

                                        privateTransfers = privateTransfers?.map((pvtTranf) => {
                                            return {
                                                ...pvtTranf,
                                                price: pvtTranf?.price + markup?.markup,
                                            };
                                        });
                                    }
                                }
                            }
                        }
                    }

                    if (req.reseller.role == "sub-agent") {
                        const subAgentMarkup = attraction?.markupSubAgent.find(
                            (markup) => markup?.activityId?.toString() == activity._id?.toString()
                        );

                        if (subAgentMarkup) {
                            if (subAgentMarkup.markupType === "percentage") {
                                const markupAmount = subAgentMarkup.markup / 100;
                                if (activity.base === "hourly") {
                                    hourlyCost *= 1 + markupAmount;
                                } else {
                                    adultCost *= 1 + markupAmount;
                                    if (childCost) {
                                        childCost *= 1 + markupAmount;
                                    }
                                    if (infantCost) {
                                        infantCost *= 1 + markupAmount;
                                    }

                                    if (activity.activityType == "transfer") {
                                        if (activity.isSharedTransferAvailable == true) {
                                            sharedTransferPrice *= 1 + markupAmount;
                                        }
                                        if (activity.isPrivateTransferAvailable == true) {
                                            privateTransfer.price *= 1 + markupAmount;

                                            privateTransfers = privateTransfers.map((pvtTranf) => {
                                                return {
                                                    ...pvtTranf,
                                                    price:
                                                        pvtTranf.price +
                                                        pvtTranf.price * markupAmount,
                                                };
                                            });
                                        }
                                    }
                                }
                            } else if (subAgentMarkup.markupType === "flat") {
                                if (activity.base === "hourly") {
                                    hourlyCost *= 1 + subAgentMarkup.markup;
                                } else {
                                    adultCost += subAgentMarkup.markup;
                                    if (childCost) {
                                        childCost += subAgentMarkup.markup;
                                    }
                                    if (infantCost) {
                                        infantCost += subAgentMarkup.markup;
                                    }

                                    if (activity.activityType == "transfer") {
                                        if (activity.isSharedTransferAvailable == true) {
                                            sharedTransferPrice += subAgentMarkup.markup;
                                        }
                                        if (activity.isPrivateTransferAvailable == true) {
                                            privateTransfer.price += subAgentMarkup.markup;

                                            privateTransfers = privateTransfers.map((pvtTranf) => {
                                                return {
                                                    ...pvtTranf,
                                                    price: pvtTranf.price + subAgentMarkup.markup,
                                                };
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }

                    const clientMarkup = attraction?.markupClient.find(
                        (markup) => markup?.activityId?.toString() == activity._id?.toString()
                    );

                    if (clientMarkup) {
                        if (clientMarkup.markupType === "percentage") {
                            const markupAmount = clientMarkup.markup / 100;
                            if (activity.base === "hourly") {
                                hourlyCost *= 1 + markupAmount;
                            } else {
                                adultCost *= 1 + markupAmount;
                                if (childCost) {
                                    childCost *= 1 + markupAmount;
                                }
                                if (infantCost) {
                                    infantCost *= 1 + markupAmount;
                                }
                                if (activity.activityType == "transfer") {
                                    if (activity.isSharedTransferAvailable == true) {
                                        sharedTransferPrice *= 1 + markupAmount;
                                    }
                                    if (activity.isPrivateTransferAvailable == true) {
                                        privateTransfer.price *= 1 + markupAmount;
                                        privateTransfers = privateTransfers.map((pvtTranf) => {
                                            return {
                                                ...pvtTranf,
                                                price:
                                                    pvtTranf.price + pvtTranf.price * markupAmount,
                                            };
                                        });
                                    }
                                }
                            }
                        } else if (clientMarkup.markupType === "flat") {
                            if (activity.base === "hourly") {
                                hourlyCost *= 1 + clientMarkup.markup;
                            } else {
                                adultCost += clientMarkup.markup;
                                if (childCost) {
                                    childCost += clientMarkup.markup;
                                }
                                if (infantCost) {
                                    infantCost += clientMarkup.markup;
                                }
                                if (activity.activityType == "transfer") {
                                    if (activity?.isSharedTransferAvailable == true) {
                                        sharedTransferPrice += clientMarkup.markup;
                                    }
                                    if (activity?.isPrivateTransferAvailable == true) {
                                        privateTransfer.price += clientMarkup?.markup;
                                        privateTransfers = privateTransfers?.map((pvtTranf) => {
                                            return {
                                                ...pvtTranf,
                                                price: pvtTranf.price + clientMarkup.markup,
                                            };
                                        });
                                    }
                                }
                            }
                        }
                    }

                    let lowPrice;
                    if (isB2bPromoCode) {
                        if (activity.activityType === "normal") {
                            if (activity.base === "hourly") {
                                lowPrice = hourlyCost;
                            } else {
                                lowPrice = Number(adultCost + b2bPromoAmountAdult);
                            }
                        } else if (activity.activityType === "transfer") {
                            if (activity.isSharedTransferAvailable === true) {
                                lowPrice = Number(sharedTransferPrice + b2bPromoAmountAdult);
                            } else {
                                lowPrice = Number(privateTransfer.price + b2bPromoAmountAdult);
                            }
                        }
                    } else {
                        if (activity.activityType === "normal") {
                            if (activity.base === "hourly") {
                                lowPrice = hourlyCost;
                            } else {
                                lowPrice = adultCost;
                            }
                        } else if (activity.activityType === "transfer") {
                            if (activity.isSharedTransferAvailable === true) {
                                lowPrice = sharedTransferPrice;
                            } else {
                                lowPrice = privateTransfer?.price;
                            }
                        }
                    }

                    return {
                        ...activity,
                        lowPrice,
                        adultPrice: adultCost || 0,
                        childPrice: childCost || 0,
                        infantPrice: infantCost || 0,
                        hourlyPrice: hourlyCost || 0,
                        sharedTransferPrice: sharedTransferPrice || 0,
                        privateTransfer: privateTransfer,
                        privateTransfers,
                    };
                });

                const activity = attraction?.activities.reduce(
                    (price, activity) => {
                        let lowPrice = activity.lowPrice || 0;

                        return {
                            lowPrice: Math.min(price.lowPrice, lowPrice),
                        };
                    },
                    { lowPrice: Infinity }
                );

                return {
                    _id,
                    title,
                    durationType,
                    duration,
                    totalRating,
                    totalReviews,
                    images,
                    activity,
                    destination,
                    category,
                    bookingType,
                    isPromoCode,
                };
            });

            res.status(200).json({
                attractions: {
                    totalAttractions: attractions[0]?.totalAttractions,
                    data: attractionList,
                },
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    listAllAttractions: async (req, res) => {
        try {
            const { skip = 0, limit = 10, search } = req.query;

            const filters1 = { isDeleted: false, isB2bActive: true };

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
                        from: "b2bspecialattractionmarkups",
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
                                                    then: req.reseller?.referredBy,
                                                    else: req.reseller?._id,
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "specialMarkup",
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
                                                $eq: [
                                                    "$resellerId",
                                                    Types.ObjectId(req?.reseller?.referredBy),
                                                ],
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
                                                $eq: [
                                                    "$resellerId",
                                                    Types.ObjectId(req?.reseller?._id),
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "markUpSubAgent",
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
                attraction.activities = attraction.activities.map((activity) => {
                    let { adultCost, childCost, infantCost, hourlyCost } = activity;

                    const markup = attraction?.b2bMarkupProfile?.activities.find(
                        (markup) => markup?.activity?.toString() === activity?._id.toString()
                    );

                    if (markup) {
                        if (markup.markupType === "percentage") {
                            const markupAmount = markup.markup / 100;
                            if (activity.base === "hourly") {
                                hourlyCost *= 1 + markupAmount;
                            } else {
                                adultCost *= 1 + markupAmount;
                                if (childCost) {
                                    childCost *= 1 + markupAmount;
                                }
                                if (infantCost) {
                                    infantCost *= 1 + markupAmount;
                                }
                            }
                        } else if (markup.markupType === "flat") {
                            if (activity.base === "hourly") {
                                hourlyCost *= 1 + markup.markup;
                            } else {
                                adultCost += markup?.markup;
                                if (childCost) {
                                    childCost += markup.markup;
                                }
                                if (infantCost) {
                                    infantCost += markup.markup;
                                }
                            }
                        }
                    }

                    if (req.reseller.role == "reseller") {
                        const subAgentMarkup = attraction?.markupSubAgent?.find(
                            (markup) => markup?.activityId?.toString() == activity._id?.toString()
                        );

                        if (subAgentMarkup) {
                            if (subAgentMarkup.markupType === "percentage") {
                                const markupAmount = subAgentMarkup.markup / 100;
                                if (activity.base === "hourly") {
                                    hourlyCost *= 1 + markupAmount;
                                } else {
                                    adultCost *= 1 + markupAmount;
                                    if (childCost) {
                                        childCost *= 1 + markupAmount;
                                    }
                                    if (infantCost) {
                                        infantCost *= 1 + markupAmount;
                                    }
                                }
                            } else if (subAgentMarkup.markupType === "flat") {
                                if (activity.base === "hourly") {
                                    hourlyCost *= 1 + subAgentMarkup.markup;
                                } else {
                                    adultCost += subAgentMarkup.markup;
                                    if (childCost) {
                                        childCost += subAgentMarkup.markup;
                                    }
                                    if (infantCost) {
                                        infantCost += subAgentMarkup.markup;
                                    }
                                }
                            }
                        }
                    }

                    const clientMarkup = attraction?.markupClient.find(
                        (markup) => markup?.activityId?.toString() == activity._id?.toString()
                    );

                    const subAgentMarkup = attraction?.markUpSubAgent.find(
                        (markup) => markup?.activityId?.toString() == activity._id?.toString()
                    );

                    return {
                        _id: activity._id,
                        name: activity.name,
                        adultCost,
                        childCost,
                        infantCost,
                        hourlyCost,
                        ...(clientMarkup !== undefined && { clientMarkup }),
                        ...(subAgentMarkup !== undefined && { subAgentMarkup }),
                    };
                });

                delete attraction.specialMarkup;
                delete attraction.markupClient;
                delete attraction.markupSubAgent;

                return {
                    _id: attraction._id,
                    activities: attraction.activities,
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

    getTimeSlot: async (req, res) => {
        try {
            const { productId, productCode, timeSlotDate, activityId } = req.body;

            const { error } = b2bTimeSlotSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "invalid activity id");
            }
            let activity = await AttractionActivity.findOne({
                isDeleted: false,
                productId,
                productCode,
                _id: activityId,
            });
            if (!activity) {
                return sendErrorResponse(res, 404, "activity not found");
            }

            let timeSlotsRate = await getTimeSlotWithRate(
                productId,
                productCode,
                timeSlotDate,
                req.reseller
            );

            let subAgentMarkup;

            let b2bMarkupProfile;

            if (req.reseller.role === "sub-agent") {
                subAgentMarkup = await B2BSubAgentAttractionMarkup.findOne({
                    resellerId: req.reseller.referredBy,
                    activityId: activity._id,
                });
                b2bMarkupProfile = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller.referredBy,
                });
            } else {
                b2bMarkupProfile = await B2BMarkupProfile.findOne({ resellerId: req.reseller._id });
            }

            let clientMarkup = await B2BClientAttractionMarkup.findOne({
                resellerId: req.reseller._id,
                activityId: activity._id,
            });

            let markup = b2bMarkupProfile?.activities.find(
                (markup) => markup?.activity?.toString() === activity?._id.toString()
            );

            let timeSlots = timeSlotsRate?.map((timeSlot) => {
                let { AdultPrice, ChildPrice } = timeSlot;

                AdultPrice = Number(AdultPrice);
                ChildPrice = Number(ChildPrice);
                if (markup) {
                    if (markup.markupType === "percentage") {
                        const markupAmount = markup.markup / 100;
                        AdultPrice *= 1 + Number(markupAmount);
                        if (ChildPrice !== null && ChildPrice !== 0) {
                            ChildPrice *= 1 + Number(markupAmount);
                        }
                    } else if (markup.markupType === "flat") {
                        AdultPrice += Number(markup.markup);
                        if (ChildPrice !== null && ChildPrice !== 0) {
                            ChildPrice += Number(markup.markup);
                        }
                    }
                }

                if (req.reseller.role === "sub-agent") {
                    if (subAgentMarkup) {
                        if (subAgentMarkup.markupType === "percentage") {
                            const markupAmount = subAgentMarkup.markup / 100;
                            AdultPrice *= 1 + Number(markupAmount);
                            if (ChildPrice !== null && ChildPrice !== 0) {
                                ChildPrice *= 1 + Number(markupAmount);
                            }
                        } else if (subAgentMarkup.markupType === "flat") {
                            AdultPrice += Number(subAgentMarkup.markup);
                            if (ChildPrice !== null && ChildPrice !== 0) {
                                ChildPrice += Number(subAgentMarkup.markup);
                            }
                        }
                    }
                }

                if (clientMarkup) {
                    if (clientMarkup.markupType === "percentage") {
                        const markupAmount = clientMarkup.markup / 100;
                        AdultPrice *= 1 + Number(markupAmount);
                        if (ChildPrice !== null && ChildPrice !== 0) {
                            ChildPrice *= 1 + Number(markupAmount);
                        }
                    } else if (clientMarkup.markupType === "flat") {
                        AdultPrice += Number(clientMarkup.markup);
                        if (ChildPrice !== null && ChildPrice !== 0) {
                            ChildPrice += Number(clientMarkup.markup);
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

    getBannaers: async (req, res) => {
        try {
            const banner = await B2bBanner.findOne({ name: "attraction", isDeleted: false });

            if (banner) {
                banner.banners = banner.banners.filter((item) => !item.isDeleted);
            } else {
                return sendErrorResponse(res, 404, "banner not found");
            }

            res.status(200).json(banner.banners || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
