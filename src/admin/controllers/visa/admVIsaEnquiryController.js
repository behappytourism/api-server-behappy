const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { Country, VisaType, Visa, VisaApplication, VisaEnquiry } = require("../../../models");

module.exports = {
    listAllVisaEnquiry: async (req, res) => {
        try {
            const { skip, limit, requestedBy = "b2c", searchQuery } = req.query;

            const filter = {};

            if (requestedBy && requestedBy !== "") {
                filter.requestedBy = requestedBy;
            }

            if (searchQuery && searchQuery !== "") {

                filter.$or = [
                    { name: { $regex: searchQuery, $options: "i" } },
                    { email: { $regex: searchQuery, $options: "i" } },
                ];
            }

            const visaEnquiries = await VisaEnquiry.find(filter)
                .populate("reseller user nationality")
                .sort({
                    createdAt: -1,
                })
                .limit(limit)
                .skip(limit * skip);

            if (!visaEnquiries || visaEnquiries.length < 1) {
                return sendErrorResponse(res, 400, "No Visa Enquiries Found ");
            }

            const totalVisaEnquiries = await VisaEnquiry.find().count();

            res.status(200).json({
                visaEnquiries,
                totalVisaEnquiries,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
