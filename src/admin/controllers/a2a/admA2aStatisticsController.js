const { B2BA2aOrder } = require("../../../b2b/models");
const { sendErrorResponse } = require("../../../helpers");

module.exports = {
    getAdminA2AStatistics: async (req, res) => {
        try {
            const { fromDate, toDate } = req.query;

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

            const paidOrders = await B2BA2aOrder.find({ orderStatus: "paid", ...filters }).count();
            const pendingOrders = await B2BA2aOrder.find({
                orderStatus: "pending",
                ...filters,
            }).count();
            const failedOrders = await B2BA2aOrder.find({
                orderStatus: "failed",
                ...filters,
            }).count();

            const b2bA2aOrders = await B2BA2aOrder.aggregate([
                { $match: { orderStatus: "paid" } },
                { $unwind: "$passengerDetails" },
                {
                    $match: {
                        $or: [
                            { "passengerDetails.status": "booked" },
                            { "passengerDetails.status": "confirmed" },
                        ],
                        ...filters,
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        volume: { $sum: "$passengerDetails.amount" },
                        profit: { $sum: "$passengerDetails.profit" },
                    },
                },
            ]);

            const topSellingResellers = await B2BA2aOrder.aggregate([
                { $match: { orderStatus: "paid" } },
                { $unwind: "$passengerDetails" },
                {
                    $match: {
                        $or: [
                            { "passengerDetails.status": "booked" },
                            { "passengerDetails.status": "confirmed" },
                        ],
                        ...filters,
                    },
                },
                {
                    $group: {
                        _id: "$reseller",
                        count: { $sum: 1 },
                        reseller: { $first: "$reseller" },
                        grandTotal: { $sum: "$passengerDetails.amount" },
                        profit: { $sum: "$passengerDetails.profit" },
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

            res.status(200).json({
                totalOrders: paidOrders + pendingOrders + failedOrders,
                paidOrders,
                pendingOrders,
                failedOrders,
                b2bA2aOrders: b2bA2aOrders[0],
                topSellingResellers,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
