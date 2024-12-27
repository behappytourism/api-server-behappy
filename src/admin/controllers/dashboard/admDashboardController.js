const { B2BOrder, B2BAttractionOrder } = require("../../../b2b/models");
const { AttractionOrder, B2COrder } = require("../../../models");

module.exports = {
    getDashboardDetails: async (req, res) => {
        try {
            const { fromDate, toDate, section = "b2b" } = req.query;

            const filters = {};

            if (fromDate && toDate) {
                filters.$and = [
                    { createdAt: { $gte: new Date(fromDate) } },
                    { createdAt: { $lte: new Date(toDate) } },
                ];
            } else if (fromDate) {
                filters["createdAt"] = { $gte: new Date(fromDate) };
            } else if (toDate) {
                filters["createdAt"] = { $lte: new Date(toDate) };
            }

            if (section === "b2b") {
                const totalOrders = await B2BOrder.aggregate([
                    {
                        $match: {
                            orderStatus: "completed",
                            ...filters,
                            // createdAt: { $gte: limitedDate },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            totalProfit: { $sum: "$netProfit" },
                            totalCost: { $sum: "$netCost" },
                            totalPrice: { $sum: "$netPrice" },
                            totalCount: { $sum: 1 }, // Count the number of documents
                        },
                    },
                ]);

                const topSellingResellers = await B2BAttractionOrder.aggregate([
                    {
                        $match: {
                            orderStatus: "completed",
                            ...filters,

                            // createdAt: { $gte: limitedDate }
                        },
                    },
                    { $unwind: "$activities" },
                    {
                        $match: {
                            "activities.status": "confirmed",
                            // ...filters,
                        },
                    },
                    {
                        $group: {
                            _id: "$reseller",
                            count: { $sum: 1 },
                            reseller: { $first: "$reseller" },
                            grandTotal: { $sum: "$activities.grandTotal" },
                            totalCost: { $sum: "$activities.totalCost" },
                            profit: { $sum: "$activities.profit" },
                            resellerMarkup: { $sum: "$activities.resellerMarkup" },
                            subAgentMarkup: { $sum: "$activities.subAgentMarkup" },
                        },
                    },
                    {
                        $sort: {
                            count: -1,
                        },
                    },
                    { $limit: 10 },
                    {
                        $lookup: {
                            from: "resellers",
                            localField: "reseller",
                            foreignField: "_id",
                            as: "reseller",
                            pipeline: [
                                {
                                    $project: {
                                        agentCode: 1,
                                        companyName: 1,
                                        role: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $set: {
                            reseller: { $arrayElemAt: ["$reseller", 0] },
                        },
                    },
                ]);

                const topSellingActivities = await B2BAttractionOrder.aggregate([
                    { $match: { orderStatus: "completed", ...filters } },
                    { $unwind: "$activities" },
                    {
                        $match: {
                            "activities.status": "confirmed",
                            // ...filters,
                        },
                    },
                    {
                        $group: {
                            _id: "$activities.activity",
                            count: { $sum: 1 },
                            activity: { $first: "$activities.activity" },
                            attraction: { $first: "$activities.attraction" },
                            grandTotal: { $sum: "$activities.grandTotal" },
                            totalCost: { $sum: "$activities.totalCost" },
                            profit: { $sum: "$activities.profit" },
                        },
                    },
                    {
                        $sort: {
                            count: -1,
                        },
                    },
                    { $limit: 10 },
                    {
                        $lookup: {
                            from: "attractions",
                            localField: "attraction",
                            foreignField: "_id",
                            as: "attraction",
                            pipeline: [
                                {
                                    $project: {
                                        title: 1,
                                        images: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $lookup: {
                            from: "attractionactivities",
                            localField: "activity",
                            foreignField: "_id",
                            as: "activity",
                            pipeline: [
                                {
                                    $project: {
                                        name: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $set: {
                            activity: { $arrayElemAt: ["$activity", 0] },
                            attraction: { $arrayElemAt: ["$attraction", 0] },
                        },
                    },
                ]);

                let latestOrders = await B2BOrder.find({
                    orderStatus: "completed",
                    ...filters,
                })
                    .populate("reseller")
                    .sort({ createdAt: -1 })
                    .limit(10);

                res.status(200).json({
                    totalProfit: totalOrders[0]?.totalProfit,
                    totalCost: totalOrders[0]?.totalCost,
                    totalPrice: totalOrders[0]?.totalPrice,
                    totalOrders: totalOrders[0]?.totalCount,
                    topSellingActivities,
                    topSellingResellers,
                    latestOrders,
                });
            } else {
                const totalOrders = await B2COrder.aggregate([
                    {
                        $match: {
                            orderStatus: "completed",
                            ...filters,

                            // createdAt: { $gte: limitedDate },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            totalProfit: { $sum: "$netProfit" },
                            totalCost: { $sum: "$netCost" },
                            totalPrice: { $sum: "$netPrice" },
                            totalCount: { $sum: 1 }, // Count the number of documents
                        },
                    },
                ]);

                const topSellingResellers = await AttractionOrder.aggregate([
                    { $match: { orderStatus: "completed", ...filters } },
                    { $unwind: "$activities" },
                    {
                        $match: {
                            // "activities.status": "confirmed",
                            // ...filters,
                        },
                    },
                    {
                        $group: {
                            _id: "$user",
                            count: { $sum: 1 },
                            user: { $first: "$user" },
                            grandTotal: { $sum: "$activities.grandTotal" },
                            totalCost: { $sum: "$activities.totalCost" },
                            profit: { $sum: "$activities.profit" },
                        },
                    },
                    {
                        $sort: {
                            count: -1,
                        },
                    },
                    { $limit: 10 },
                    {
                        $lookup: {
                            from: "users",
                            localField: "user",
                            foreignField: "_id",
                            as: "user",
                            pipeline: [
                                {
                                    $project: {
                                        name: 1,
                                        email: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $set: {
                            user: { $arrayElemAt: ["$user", 0] },
                        },
                    },
                ]);

                const topSellingActivities = await AttractionOrder.aggregate([
                    { $match: { orderStatus: "completed", ...filters } },
                    { $unwind: "$activities" },
                    {
                        $match: {
                            // "activities.status": "confirmed",
                            // ...filters,
                        },
                    },
                    {
                        $group: {
                            _id: "$activities.activity",
                            count: { $sum: 1 },
                            activity: { $first: "$activities.activity" },
                            attraction: { $first: "$activities.attraction" },
                            grandTotal: { $sum: "$activities.grandTotal" },
                            totalCost: { $sum: "$activities.totalCost" },
                            profit: { $sum: "$activities.profit" },
                        },
                    },
                    {
                        $sort: {
                            count: -1,
                        },
                    },
                    { $limit: 10 },
                    {
                        $lookup: {
                            from: "attractions",
                            localField: "attraction",
                            foreignField: "_id",
                            as: "attraction",
                            pipeline: [
                                {
                                    $project: {
                                        title: 1,
                                        images: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $lookup: {
                            from: "attractionactivities",
                            localField: "activity",
                            foreignField: "_id",
                            as: "activity",
                            pipeline: [
                                {
                                    $project: {
                                        name: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $set: {
                            activity: { $arrayElemAt: ["$activity", 0] },
                            attraction: { $arrayElemAt: ["$attraction", 0] },
                        },
                    },
                ]);

                let latestOrders = await B2COrder.find({
                    orderStatus: "completed",
                    ...filters,
                })
                    .populate("user")
                    .sort({ createdAt: -1 })
                    .limit(10);

                res.status(200).json({
                    totalProfit: totalOrders[0]?.totalProfit,
                    totalCost: totalOrders[0]?.totalCost,
                    totalPrice: totalOrders[0]?.totalPrice,
                    totalOrders: totalOrders[0]?.totalCount,
                    topSellingActivities,
                    latestOrders,
                    topSellingResellers,
                });
            }
        } catch (e) {
            console.log(e);
        }
    },
};
