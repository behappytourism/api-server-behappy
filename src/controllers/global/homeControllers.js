const { sendErrorResponse } = require("../../helpers");
const {
    HomeSettings,
    Attraction,
    Country,
    Destination,
    Blog,
    Currency,
    CompanyAddress,
    B2cHomeSettings,
    ContactUs,
} = require("../../models");
const { City, State } = require("../../models/global");
const B2CBanner = require("../../models/global/b2cBanner.model");

module.exports = {
    getHomeData: async (req, res) => {
        try {
            const home = await B2cHomeSettings.findOne({
                settingsNumber: 1,
            }).lean();

            if (!home) {
                return sendErrorResponse(res, 404, "Home settings not added yet.");
            }

            let bestSellingAttractions = [];
            if (
                home?.isBestSellingAttractionsSectionEnabled &&
                home?.bestSellingAttractions?.length > 0
            ) {
                bestSellingAttractions = await Attraction.aggregate([
                    {
                        $match: {
                            _id: { $in: home.bestSellingAttractions },
                            isDeleted: false,
                            isB2cActive: true,
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
                                    $sort: { adultCost: 1 },
                                },
                                {
                                    $limit: 1,
                                },
                            ],
                            as: "activity",
                        },
                    },
                    {
                        $addFields: {
                            isPromoCode: {
                                $anyElementTrue: {
                                    $map: {
                                        input: "$activity",
                                        as: "activity",
                                        in: "$$activity.isPromoCode",
                                    },
                                },
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: "attractioncategories",
                            foreignField: "_id",
                            localField: "category",
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
                            from: "b2cattractionmarkups",
                            localField: "_id",
                            foreignField: "attraction",
                            as: "markup",
                        },
                    },
                    {
                        $set: {
                            activity: { $arrayElemAt: ["$activity", 0] },
                            category: { $arrayElemAt: ["$category", 0] },
                            destination: { $arrayElemAt: ["$destination", 0] },
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
                        },
                    },
                    {
                        $lookup: {
                            from: "b2cattractionmarkups",
                            localField: "activity._id",
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
                        $project: {
                            title: 1,
                            category: {
                                categoryName: 1,
                                slug: 1,
                            },
                            images: 1,
                            bookingType: 1,
                            activity: {
                                lowPrice: {
                                    $cond: [
                                        {
                                            $eq: ["$markup.adultMarkupType", "percentage"],
                                        },
                                        {
                                            $sum: [
                                                "$activity.adultCost",
                                                {
                                                    $divide: [
                                                        {
                                                            $multiply: [
                                                                "$markup.adultMarkup",
                                                                "$activity.adultCost",
                                                            ],
                                                        },
                                                        100,
                                                    ],
                                                },
                                            ],
                                        },
                                        {
                                            $sum: ["$activity.adultCost", "$markup.adultMarkup"],
                                        },
                                    ],
                                },
                                promoAmountAdult: 1,
                            },
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
                            destination: {
                                name: 1,
                                slug: 1,
                            },
                            slug: 1,
                            isPromoCode: 1,
                        },
                    },
                ]);
            }

            let topAttractions = [];
            if (home?.isTopAttractionsSectionEnabled && home?.topAttractions?.length > 0) {
                topAttractions = await Attraction.aggregate([
                    {
                        $match: {
                            _id: { $in: home.topAttractions },
                            isDeleted: false,
                            isB2cActive: true,
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
                                    $sort: { adultCost: 1 },
                                },
                                {
                                    $limit: 1,
                                },
                            ],
                            as: "activity",
                        },
                    },
                    {
                        $addFields: {
                            isPromoCode: {
                                $anyElementTrue: {
                                    $map: {
                                        input: "$activity",
                                        as: "activity",
                                        in: "$$activity.isPromoCode",
                                    },
                                },
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: "attractioncategories",
                            foreignField: "_id",
                            localField: "category",
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
                    {
                        $lookup: {
                            from: "destinations",
                            localField: "destination",
                            foreignField: "_id",
                            as: "destination",
                        },
                    },
                    {
                        $set: {
                            activity: { $arrayElemAt: ["$activity", 0] },
                            category: { $arrayElemAt: ["$category", 0] },
                            destination: { $arrayElemAt: ["$destination", 0] },
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
                        $lookup: {
                            from: "b2cattractionmarkups",
                            localField: "activity._id",
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
                        $project: {
                            title: 1,
                            category: {
                                categoryName: 1,
                                slug: 1,
                            },
                            images: 1,
                            bookingType: 1,
                            activity: {
                                lowPrice: {
                                    $cond: [
                                        {
                                            $eq: ["$markup.adultMarkupType", "percentage"],
                                        },
                                        {
                                            $sum: [
                                                "$activity.adultCost",
                                                {
                                                    $divide: [
                                                        {
                                                            $multiply: [
                                                                "$markup.adultMarkup",
                                                                "$activity.adultCost",
                                                            ],
                                                        },
                                                        100,
                                                    ],
                                                },
                                            ],
                                        },
                                        {
                                            $sum: ["$activity.adultCost", "$markup.adultMarkup"],
                                        },
                                    ],
                                },
                                promoAmountAdult: 1,
                            },
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
                            destination: {
                                name: 1,
                                slug: 1,
                            },
                            slug: 1,
                            isPromoCode: 1,
                        },
                    },
                ]);
            }

            recentBlogs = [];
            if (home?.isBlogsEnabled) {
                recentBlogs = await Blog.find({ isDeleted: false })
                    .populate("category")
                    .sort({ createdAt: -1 })
                    .lean();
            }

            res.status(200).json({
                home,
                bestSellingAttractions,
                topAttractions,
                recentBlogs,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getInitialData: async (req, res) => {
        try {
            const countries = await Country.find({ isDeleted: false })
                .sort({ countryName: 1 })
                // .collation({ locale: "en", caseLevel: true })
                .lean();
            const destinations = await Destination.find({ isDeleted: false }).lean();
            const currencies = await Currency.find({})
                .populate("country", "countryName flag")
                .lean();

            // const popularHotelCities = await City.aggregate([
            //     {
            //         $match: { isDeleted: false },
            //     },
            //     {
            //         $lookup: {
            //             from: "countries",
            //             localField: "country",
            //             foreignField: "_id",
            //             as: "country",
            //             pipeline: [{ $match: { isDeleted: false } }],
            //         },
            //     },
            //     {
            //         $lookup: {
            //             from: "states",
            //             localField: "state",
            //             foreignField: "_id",
            //             as: "state",
            //             pipeline: [{ $match: { isDeleted: false } }],
            //         },
            //     },
            //     {
            //         $lookup: {
            //             from: "hotels",
            //             let: { cityId: "$_id" },
            //             pipeline: [
            //                 {
            //                     $match: {
            //                         $expr: { $eq: ["$city", "$$cityId"] },
            //                         isDeleted: false,
            //                         isActive: true,
            //                         isPublished: true,
            //                     },
            //                 },
            //                 { $group: { _id: null, totalCount: { $sum: 1 } } },
            //                 { $project: { _id: 0, totalCount: 1 } },
            //             ],
            //             as: "hotels",
            //         },
            //     },
            //     {
            //         $set: {
            //             country: { $arrayElemAt: ["$country", 0] },
            //             state: { $arrayElemAt: ["$state", 0] },
            //             hotels: { $arrayElemAt: ["$hotels", 0] },
            //         },
            //     },
            //     {
            //         $project: {
            //             suggestionType: "CITY",
            //             countryName: "$country.countryName",
            //             stateName: "$state.stateName",
            //             cityName: 1,
            //             cityId: "$_id",
            //             propertyCount: "$hotels.totalCount",
            //             clickable: true,
            //             childSuggestions: [],
            //         },
            //     },
            //     { $sort: { propertyCount: -1 } },
            //     { $limit: 5 },
            // ]);

            const popularHotelCities = [
                {
                    _id: "64cb62341e2b74a2319af523",
                    suggestionType: "CITY",
                    countryName: "United Arab Emirates",
                    stateName: "Dubai",
                    cityName: "Dubai",
                    cityId: "64cb62341e2b74a2319af523",
                    propertyCount: 710,
                    clickable: true,
                    childSuggestions: [],
                },
                {
                    _id: "64cb6af01e2b74a2319b7ec3",
                    suggestionType: "CITY",
                    countryName: "United Arab Emirates",
                    stateName: "Abu Dhabi",
                    cityName: "Abu Dhabi",
                    cityId: "64cb6af01e2b74a2319b7ec3",
                    propertyCount: 133,
                    clickable: true,
                    childSuggestions: [],
                },
                {
                    _id: "650bfda822345a0516003591",
                    suggestionType: "CITY",
                    countryName: "France",
                    stateName: "Paris",
                    cityName: "Paris",
                    cityId: "650bfda822345a0516003591",
                    propertyCount: 2291,
                    clickable: true,
                    childSuggestions: [],
                },
                {
                    _id: "650bfda622345a05160030a2",
                    suggestionType: "CITY",
                    countryName: "United States",
                    stateName: "New York City",
                    cityName: "New York Area - NY",
                    cityId: "650bfda622345a05160030a2",
                    propertyCount: 744,
                    clickable: true,
                    childSuggestions: [],
                },
                {
                    _id: "",
                    suggestionType: "CITY",
                    countryName: "England",
                    stateName: "London",
                    cityName: "London",
                    cityId: "",
                    propertyCount: 554,
                    clickable: true,
                    childSuggestions: [],
                },
            ];

            res.status(200).json({
                countries,
                destinations,
                currencies,
                popularHotelCities,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getContactDetails: async (req, res) => {
        try {
            const home = await B2cHomeSettings.findOne({
                settingsNumber: 1,
            }).lean();

            if (!home) {
                return sendErrorResponse(res, 404, "Contact details not added");
            }

            const addresses = await CompanyAddress.find({})
                .populate("country", "countryName")
                .populate("state", "stateName")
                .lean();

            res.status(200).json({
                email: home?.email || "",
                phoneNumber1: home?.phoneNumber1 || "",
                phoneNumber2: home?.phoneNumber2 || "",
                facebookUrl: home?.facebookUrl || "",
                instagramUrl: home?.instagramUrl || "",
                youtubeUrl: home?.youtubeUrl || "",
                twitterUrl: home?.twitterUrl || "",
                tripAdvisorUrl: home?.tripAdvisorUrl || "",
                footerDescription: home?.footerDescription || "",
                addresses: addresses || [],
                footer:
                    home?.footer.map((footer) => {
                        const sortedNavLinks = [...footer?.navLinks].sort(
                            (a, b) => (a?.displayOrder || 0) - (b?.displayOrder || 0)
                        );
                        return { ...footer, navLinks: sortedNavLinks };
                    }) || [],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    contactUsMessage: async (req, res) => {
        try {
            const { name, email, message, phone, country } = req.body;
            const getInTouchData = await ContactUs.create({ name, email, message, phone, country });
            res.status(200).json({
                message: "Created",
                getInTouchData,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getHomeBannaers: async (req, res) => {
        try {
            const { name } = req.query;
            const banner = await B2CBanner.findOne({ name: name, isDeleted: false });

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

    getAboutUs: async (req, res) => {
        try {
            const home = await B2cHomeSettings.findOne({
                settingsNumber: 1,
            }).lean();

            if (!home) {
                return sendErrorResponse(res, 404, "About us  details not added");
            }

            res.status(200).json({
                aboutUs: home?.aboutUs || "",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getReviews: async (req, res) => {
        try {
            const home = await B2cHomeSettings.findOne({
                settingsNumber: 1,
            }).lean();

            if (!home) {
                return sendErrorResponse(res, 404, "Review details not added");
            }

            res.status(200).json(home?.reviews || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
