const { Types, isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const {
    Destination,
    Attraction,
    AttractionCategory,
    AttractionActivity,
} = require("../../../models");
const {
    b2bApiAttractionActivityPriceSchema,
    b2bApiAttractionSlotSchema,
} = require("../../validations/attractionApi/b2bApiAttraction.schema");
const {
    B2BMarkupProfile,
    B2BClientAttractionMarkup,
    B2BSubAgentAttractionMarkup,
} = require("../../models");
const { getTimeSlotWithRate } = require("../../helpers");

module.exports = {
    getApiAttractionAllDestinations: async (req, res) => {
        try {
            const processTimeStart = Date.now();
            const destinations = await Destination.find({ isDeleted: false })
                .select({
                    code: 1,
                    name: 1,
                    image: { $concat: [process.env.SERVER_URL, "$image"] },
                    _id: 0,
                })
                .sort({ name: 1 })
                .lean();

            res.status(200).json({
                auditData: {
                    processTime: Date.now() - processTimeStart,
                    timestamp: new Date().toISOString(),
                },
                totalDestinations: destinations?.length,
                destinations,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllApiAttractionCategories: async (req, res) => {
        try {
            const processTimeStart = Date.now();
            const categories = await AttractionCategory.find({})
                .select("-_id code categoryName description")
                .sort({ categoryName: 1 })
                .lean();

            res.status(200).json({
                auditData: {
                    processTime: Date.now() - processTimeStart,
                    timestamp: new Date().toISOString(),
                },
                totalCategories: categories?.length,
                categories,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllApiAttractionsList: async (req, res) => {
        try {
            const processTimeStart = Date.now();
            const { skip = 0, limit = 100 } = req.query;

            // TODO:
            // cache this attraction fetching and clear cache whenever attraction is added, updated or removed
            const attractions = await Attraction.find({ isDeleted: false, isActive: true })
                .populate({ path: "destination", select: "-_id code" })
                .populate({ path: "category", select: "-_id code" })
                .select({
                    _id: 0,
                    code: 1,
                    title: 1,
                    country: 1,
                    destination: 1,
                    category: 1,
                    bookingType: 1,
                    bookingPriorDays: 1,
                    durationInSeconds: 1,
                    youtubeLink: 1,
                    images: {
                        $map: {
                            input: "$images",
                            as: "image",
                            in: {
                                $concat: [process.env.SERVER_URL, "$$image"],
                            },
                        },
                    },
                    highlights: 1,
                    sections: {
                        title: 1,
                        body: 1,
                    },
                    faqs: 1,
                    isApiConnected: 1,
                    geo: {
                        latitude: "$latitude",
                        longitude: "$longitude",
                    },
                    availability: {
                        day: 1,
                        open: 1,
                        close: 1,
                        isEnabled: 1,
                    },
                    offDates: 1,
                })
                .sort({ title: 1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalAttractions = await Attraction.find({
                isDeleted: false,
                isActive: true,
            }).count();

            res.status(200).json({
                auditData: {
                    processTime: Date.now() - processTimeStart,
                    timestamp: new Date().toISOString(),
                },
                totalAttractions,
                skip: Number(skip),
                limit: Number(limit),
                attractions,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllApiAttractionActivitiesPrice: async (req, res) => {
        try {
            const processTimeStart = Date.now();
            const { attractions = [], destination, category } = req.body;

            const { error } = b2bApiAttractionActivityPriceSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const filters1 = { isDeleted: false, isActive: true };

            if (attractions && attractions.length > 0) {
                filters1["code"] = { $in: attractions };
            }

            const filters2 = {};

            if (destination && destination.code) {
                filters2["destination.code"] = destination.code;
            }

            if (category && category.code) {
                filters2["category.code"] = Number(category.code);
            }

            let attractionList = await Attraction.aggregate([
                { $match: filters1 },
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
                { $match: filters2 },
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
                                            { $eq: ["$isActive", true] },
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
                                $project: {
                                    isActive: 0,
                                    createdAt: 0,
                                    updatedAt: 0,
                                    isDeleted: 0,
                                    description: 0,
                                    isQuotation: 0,
                                    qtnActivityType: 0,
                                    isPromoCode: 0,
                                    promoCode: 0,
                                    promoAmountAdult: 0,
                                    promoAmountChild: 0,
                                    ticketPricing: 0,
                                    transferPricing: 0,
                                    isCarousel: 0,
                                    isPromoCodeB2b: 0,
                                    promoAmount: 0,
                                    promoAmountB2b: 0,
                                    promoCodeB2b: 0,
                                    b2bPromoAmountAdult: 0,
                                    b2bPromoAmountChild: 0,
                                    b2bPromoCode: 0,
                                    carouselPosition: 0,
                                    isB2bPromoCode: 0,
                                    __v: 0,
                                },
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
                    $project: {
                        _id: 0,
                        code: 1,
                        title: 1,
                        destinationName: "$destination.name",
                        destinationCode: "$destination.code",
                        categoryName: "$category.categoryName",
                        categoryCode: "$category.code",
                        b2bMarkupProfile: 1,
                        markupClient: 1,
                        markupSubAgent: 1,
                        activities: 1,
                    },
                },
            ]);

            attractionList = attractionList.map((attraction) => {
                const myActivities = attraction.activities.map((activity) => {
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
                        adultCost: undefined,
                        childCost: undefined,
                        infantCost: undefined,
                        hourlyCost: undefined,
                        sharedTransferPrice: sharedTransferPrice || 0,
                        sharedTransferCost: undefined,
                        privateTransfer: undefined,
                        _id: undefined,
                        attraction: undefined,
                        privateTransfers: privateTransfers?.map((transfer) => {
                            return { ...transfer, cost: undefined, _id: undefined };
                        }),
                    };
                });

                return {
                    ...attraction,
                    cancellationType: "non-refundable",
                    b2bMarkupProfile: undefined,
                    markupClient: undefined,
                    markupSubAgent: undefined,
                    activities: myActivities,
                };
            });

            res.status(200).json({
                auditData: {
                    processTime: Date.now() - processTimeStart,
                    timestamp: new Date().toISOString(),
                },
                totalAttractions: attractionList?.length,
                attractions: attractionList,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getB2bAttractionApiTimeSlots: async (req, res) => {
        try {
            const processTimeStart = Date.now();
            const { date, activityId } = req.body;

            const { error } = b2bApiAttractionSlotSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "invalid activity id");
            }
            const activity = await AttractionActivity.findOne({
                isDeleted: false,
                _id: activityId,
            }).lean();
            if (!activity) {
                return sendErrorResponse(res, 400, "activity not found");
            }

            let timeSlotsRate = await getTimeSlotWithRate(
                activity.productId,
                activity.productCode,
                date
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

            res.status(200).json({
                auditData: {
                    processTime: Date.now() - processTimeStart,
                    timestamp: new Date().toISOString(),
                },
                timeSlots,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
