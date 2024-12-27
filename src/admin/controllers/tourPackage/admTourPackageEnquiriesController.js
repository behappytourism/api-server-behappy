const { B2BTourPackageEnquiry } = require("../../../b2b/models/tourPackage");
const { sendErrorResponse } = require("../../../helpers");

module.exports = {
    getAllB2BTourPackageEnquiries: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const packageEnquiries = await B2BTourPackageEnquiry.find({})
                .populate("resellerId", "companyName agentCode")
                .populate("tourPackageId", "packageName")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalPackageEnquiries = await B2BTourPackageEnquiry.count();

            res.status(200).json({
                totalPackageEnquiries,
                skip: Number(skip),
                limit: Number(limit),
                packageEnquiries,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
