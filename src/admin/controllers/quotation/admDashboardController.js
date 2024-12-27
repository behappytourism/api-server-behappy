const { Reseller } = require("../../../b2b/models");
const { sendErrorResponse } = require("../../../helpers");
const {
    Quotation,
    QuotationAmendment,
    HotelQuotation,
    ExcursionQuotation,
} = require("../../../models");

module.exports = {
    getDashboardData: async (req, res) => {
        try {
            const { dateFrom, dateTo } = req.query;
            const filters = {};

            if (dateFrom && dateFrom !== "") {
                filters.createdAt = { $gte: new Date(dateFrom) };
            }

            if (dateTo && dateTo !== "") {
                filters.createdAt = {
                    ...filters.createdAt,
                    $lte: new Date(new Date(dateTo).setDate(new Date(dateTo).getDate() + 1)),
                };
            }

            const totalQuotations = await Quotation.find(filters).count();
            const totalAmendments = await QuotationAmendment.find(filters).count();
            const totalAgents = await Reseller.find({
                ...filters,
            }).count();

            const topHotels = await HotelQuotation.aggregate([
                { $match: filters },
                { $unwind: "$stays" },
                { $unwind: "$stays.hotels" },

                {
                    $group: {
                        _id: "$stays.hotels.hotelId",
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                {
                    $lookup: {
                        from: "hotels",
                        localField: "_id",
                        foreignField: "_id",
                        as: "hotel",
                    },
                },
                {
                    $set: {
                        hotel: { $arrayElemAt: ["$hotel", 0] },
                    },
                },
                { $match: { hotel: { $exists: true } } },
                { $limit: 10 },
            ]);

            const topExcursions = await ExcursionQuotation.aggregate([
                { $match: filters },
                { $unwind: "$excursions" },
                {
                    $group: {
                        _id: "$excursions.excursionId",
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                {
                    $lookup: {
                        from: "attractionactivities",
                        localField: "_id",
                        foreignField: "_id",
                        as: "excursion",
                    },
                },
                {
                    $set: {
                        excursion: { $arrayElemAt: ["$excursion", 0] },
                    },
                },
                { $match: { excursion: { $exists: true } } },
                { $limit: 10 },
            ]);

            const topAgents = await Quotation.aggregate([
                { $match: filters },
                {
                    $group: {
                        _id: "$reseller",
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                {
                    $lookup: {
                        from: "resellers",
                        localField: "_id",
                        foreignField: "_id",
                        as: "reseller",
                    },
                },
                {
                    $set: {
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                    },
                },
                { $match: { reseller: { $exists: true } } },
                {
                    $project: {
                        count: 1,
                        reseller: {
                            name: 1,
                            email: 1,
                        },
                    },
                },
                { $limit: 10 },
            ]);

            res.status(200).json({
                totalQuotations,
                totalAgents,
                totalAmendments,
                topHotels,
                topAgents,
                topExcursions,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
