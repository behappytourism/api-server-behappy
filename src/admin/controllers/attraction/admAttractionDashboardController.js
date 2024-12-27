const { B2BAttractionOrder } = require("../../../b2b/models");
const { sendErrorResponse } = require("../../../helpers");

module.exports = {
    getAttractionDashbaordData: async (req, res) => {
        try {
            const b2bRecentAttrOrders = await B2BAttractionOrder.find({ orderStatus: "completed" })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate({
                    path: "activities.attraction",
                    select: { title: 1 },
                })
                .populate({
                    path: "activities.activity",
                    select: { name: 1 },
                })
                .populate("reseller", "agentCode companyName name")
                .select(
                    "activities.attraction activities.activity reseller totalAmount referenceNumber orderStatus"
                )
                .lean();

            // b2b + b2c
            // const topSellingAttractions;

            // const topResellers

            // recent CancellationRequests

            res.status(200).json({ b2bRecentAttrOrders });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
