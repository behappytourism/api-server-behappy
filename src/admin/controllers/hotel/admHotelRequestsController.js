const { sendErrorResponse } = require("../../../helpers");
const { B2BHotelRequest } = require("../../../b2b/models/hotel");

module.exports = {
    getAllB2bHotelRequests: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.body;

            const hotelRequests = await B2BHotelRequest.find({})
                .populate({
                    path: "hotel",
                    populate: {
                        path: "country state city",
                    },
                    select: "hotelName country state city starCategory",
                })
                .populate("roomType", "roomName")
                .populate("boardType", "boardName boardShortName")
                .populate("reseller", "companyName agentCode")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalHotelRequests = await B2BHotelRequest.find({}).count();

            res.status(200).json({
                hotelRequests,
                totalHotelRequests,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
