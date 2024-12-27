const { B2BGlobalConfiguration } = require("../../admin/models");
const { saveCustomCache, getSavedCache } = require("../../config/cache");
const { sendErrorResponse } = require("../../helpers");
const { Hotel, FeaturedHotel, HotelBannerAd } = require("../../models/hotel");

module.exports = {
    getB2bHotelHomeData: async (req, res) => {
        try {
            const configuration = await B2BGlobalConfiguration.findOne({
                settingsNumber: 1,
            }).lean();

            const promotions = await HotelBannerAd.find({}).sort({ priority: 1 }).lean();

            const promotions1 = promotions
                ?.filter((_, index) => index % 2 !== 0)
                ?.map((item) => item?.bannerImage);

            const promotions2 = promotions
                ?.filter((_, index) => index % 2 === 0)
                ?.map((item) => item?.bannerImage);

            let featuredHotels = await getSavedCache("featuredHotelsList");
            if (!featuredHotels || featuredHotels?.length < 1) {
                featuredHotels = await FeaturedHotel.find({ showHomePage: true })
                    .sort({ priority: 1 })
                    .lean();

                saveCustomCache("featuredHotelsList", featuredHotels);
            }

            const featuredHotels1 = featuredHotels
                ?.filter((_, index) => index % 2 !== 0)
                ?.map((item) => item);

            const featuredHotels2 = featuredHotels
                ?.filter((_, index) => index % 2 === 0)
                ?.map((item) => item);

            res.status(200).json({
                hotelBackgroundImages: configuration.hotelBackgroundImages || [],
                promotions1,
                promotions2,
                featuredHotels1,
                featuredHotels2,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSuggestedHotels: async (req, res) => {
        try {
            const { skip = 0, limit = 8 } = req.query;

            const suggestedHotels = await Hotel.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        isActive: true,
                        isPublished: true,
                    },
                },
                {
                    $lookup: {
                        from: "hotelpromotions",
                        localField: "_id",
                        foreignField: "hotel",
                        as: "promotions",
                        pipeline: [
                            {
                                $match: {
                                    isDeleted: false,
                                    isActive: true,
                                    // bookingWindowFrom: { $lte: new Date() },
                                    bookingWindowTo: { $gte: new Date() },
                                },
                            },
                        ],
                    },
                },
                {
                    $addFields: {
                        totalPromotions: { $size: "$promotions" },
                    },
                },
                {
                    $match: {
                        totalPromotions: { $gte: 1 },
                    },
                },
                {
                    $lookup: {
                        from: "countries",
                        localField: "country",
                        foreignField: "_id",
                        as: "country",
                        pipeline: [
                            { $match: { isDeleted: false } },
                            { $project: { countryName: 1 } },
                        ],
                    },
                },
                {
                    $lookup: {
                        from: "states",
                        localField: "state",
                        foreignField: "_id",
                        as: "state",
                        pipeline: [
                            { $match: { isDeleted: false } },
                            { $project: { stateName: 1 } },
                        ],
                    },
                },
                {
                    $lookup: {
                        from: "cities",
                        localField: "city",
                        foreignField: "_id",
                        as: "city",
                        pipeline: [{ $match: { isDeleted: false } }, { $project: { cityName: 1 } }],
                    },
                },
                {
                    $project: {
                        hotelName: 1,
                        image: { $arrayElemAt: ["$images", 0] },
                        country: { $arrayElemAt: ["$country", 0] },
                        state: { $arrayElemAt: ["$state", 0] },
                        city: { $arrayElemAt: ["$city", 0] },
                        starCategory: 1,
                        totalPromotions: 1,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalSuggestedHotels: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },

                {
                    $project: {
                        totalSuggestedHotels: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                skip: Number(skip),
                limit: Number(limit),
                suggestedHotels: suggestedHotels[0] || { totalSuggestedHotels: 0, data: [] },
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
