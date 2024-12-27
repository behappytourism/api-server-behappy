const { sendErrorResponse } = require("../../../helpers");
const { VisaApplication } = require("../../../models");
const { createVisaDownloadSummary } = require("../../helpers/b2bVisaOrderHelper");

module.exports = {
    getB2BAllVisaApplication: async (req, res) => {
        try {
            const { skip = 0, limit = 10, search } = req.query;

            let query = { reseller: req.reseller._id, status: "payed" };

            if (search && search !== "") {
                query.referenceNumber = { $regex: search, $options: "i" };
            }

            console.log(search, "search");

            const visaApplication = await VisaApplication.find(query)
                .sort({
                    createdAt: -1,
                })
                .populate({
                    path: "visaType",
                    populate: {
                        path: "visa",
                        populate: {
                            path: "country",
                            select: "countryName",
                        },
                    },
                })
                .limit(limit)
                .skip(limit * skip);

            if (!visaApplication) {
                return sendErrorResponse(res, 400, "No Visa Application Available");
            }

            const totalVisaApplication = await VisaApplication.find(query).count();

            res.status(200).json({
                visaApplication,
                skip: Number(skip),
                limit: Number(limit),
                totalVisaApplication,
            });
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    downloadVisaApplicationSummary: async (req, res) => {
        try {
            const { skip = 0, limit = 10, dateFrom, dateTo, search } = req.query;

            let query = { reseller: req.reseller._id, status: "payed" };

            if (search && search !== "") {
                query.referenceNumber = { $regex: search, $options: "i" };
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                query.$and = [
                    { createdAt: { $gte: new Date(dateFrom) } },
                    { createdAt: { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                query["createdAt"] = {
                    $gte: new Date(dateFrom),
                };
            } else if (dateTo && dateTo !== "") {
                query["createdAt"] = { $lte: new Date(dateTo) };
            }

            const visaApplication = await VisaApplication.aggregate([
                { $match: query },
                { $unwind: "$travellers" },
                {
                    $lookup: {
                        from: "visatypes",
                        localField: "visaType",
                        foreignField: "_id",
                        as: "visaType",
                    },
                },
                {
                    $set: {
                        visaType: {
                            $arrayElemAt: ["$visaType", 0],
                        },
                    },
                },
                {
                    $lookup: {
                        from: "visas",
                        localField: "visaType.visa",
                        foreignField: "_id",
                        as: "visa",
                    },
                },
                {
                    $set: {
                        visa: {
                            $arrayElemAt: ["$visa", 0],
                        },
                    },
                },
                { $sort: { createdAt: -1 } },
                { $skip: Number(limit) * Number(skip) },
                { $limit: Number(limit) },
            ]);

            if (!visaApplication) {
                return sendErrorResponse(res, 400, "No Visa Application Available");
            }

            console.log(visaApplication, "visaApplication");

            await createVisaDownloadSummary(visaApplication, res);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getB2BSingleVisaApplication: async (req, res) => {
        try {
            const { id } = req.params;

            let query = {
                _id: id,
                reseller: req.reseller._id,
                status: "payed",
            };

            const visaApplication = await VisaApplication.findOne(query)
                .populate("reseller travellers.documents travellers.country")
                .populate({
                    path: "visaType",
                    populate: {
                        path: "visa",
                        populate: {
                            path: "country",
                            select: "countryName",
                        },
                    },
                });

            if (!visaApplication) {
                return sendErrorResponse(res, 400, "No Visa Application Available");
            }

            res.status(200).json(visaApplication);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    visaSingleTraveller: async (req, res) => {
        try {
            const { applicationId, travellerId } = req.params;

            const visaApplication = await VisaApplication.findOne({
                _id: applicationId,
            });

            if (!visaApplication) {
                return sendErrorResponse(res, 400, "No Visa Application Found Available");
            }

            const filteredTraveller = visaApplication.travellers.filter((traveller) => {
                return traveller._id == travellerId;
            });

            if (!filteredTraveller) {
                return sendErrorResponse(res, 400, "No Traveller Found Available");
            }

            res.status(200).json(...filteredTraveller);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
