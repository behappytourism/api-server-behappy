const { isValidObjectId, Types } = require("mongoose");
const { sendErrorResponse, sendMobileOtp } = require("../../../helpers");
const {
    VisaType,
    VisaApplication,
    Visa,
    Country,
    VisaDocument,
    VisaNationality,
} = require("../../../models");

module.exports = {
    listAllCountry: async (req, res) => {
        try {
            const visaCountry = await Visa.find({ isDeleted: false }).select("country").populate({
                path: "country",
                select: "countryName",
            });

            if (!visaCountry) {
                return sendErrorResponse(res, 400, "No Visa Available");
            }

            res.status(200).json(visaCountry);
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    listAllNationality: async (req, res) => {
        try {
            const visaNationalities = await VisaNationality.aggregate([
                {
                    $match: { isDeleted: false },
                },
                {
                    $lookup: {
                        from: "countries", // Assuming the collection name is 'nationalities'
                        localField: "nationality",
                        foreignField: "_id",
                        as: "nationality",
                    },
                },
                {
                    $unwind: "$nationality",
                },
                {
                    $project: {
                        slug: 1,
                        nationality: "$nationality.countryName",
                    },
                },
            ]);

            if (!visaNationalities) {
                return sendErrorResponse(res, 400, "No Visa Nationalities Found ");
            }

            res.status(200).json(visaNationalities);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listVisaType: async (req, res) => {
        try {
            const { visaId, nationalityId } = req.params;

            if (!isValidObjectId(visaId)) {
                return sendErrorResponse(res, 400, "Invalid Visa id");
            }

            if (!isValidObjectId(nationalityId)) {
                return sendErrorResponse(res, 400, "Invalid nationality id");
            }

            let visa = await Visa.findOne({
                _id: visaId,
                isDeleted: false,
            }).populate("country");

            if (!visa) {
                return sendErrorResponse(res, 400, "No Visa ");
            }

            let visaTypes = await VisaNationality.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(nationalityId),
                        isDeleted: false,
                    },
                },
                {
                    $unwind: "$visas",
                },
                {
                    $match: {
                        "visas.isDeleted": false,
                        "visas.createdFor": "b2b",
                    },
                },
                {
                    $lookup: {
                        from: "visatypes",
                        localField: "visas.visaType",
                        foreignField: "_id",
                        as: "visaType",
                    },
                },

                {
                    $set: {
                        visaType: { $arrayElemAt: ["$visaType", 0] },
                    },
                },
                {
                    $set: {
                        "visaType.adultPrice": "$visas.adultPrice", // Use correct field path
                        "visaType.childPrice": "$visas.childPrice", // Use correct field path
                    },
                },
                {
                    $match: {
                        "visaType.visa": Types.ObjectId(visa._id), // Use correct field path
                        "visaType.isDeleted": false,
                    },
                },
                {
                    $lookup: {
                        from: "b2bclientvisamarkups",
                        let: {
                            visaType: "$visaType._id",
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ["$resellerId", req.reseller._id],
                                            },
                                            {
                                                $eq: ["$visaType", "$$visaType"],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "markupClient",
                    },
                },
                {
                    $lookup: {
                        from: "b2bsubagentvisamarkups",
                        let: {
                            visaType: "$visaType._id",
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ["$resellerId", req?.reseller?.referredBy],
                                            },
                                            {
                                                $eq: ["$visaType", "$$visaType"],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "markupSubAgent",
                    },
                },
                {
                    $set: {
                        "visaType.markupClient": { $arrayElemAt: ["$markupClient", 0] }, // Use correct field path
                        "visaType.markupSubAgent": { $arrayElemAt: ["$markupSubAgent", 0] }, // Use correct field path
                    },
                },
                {
                    $replaceRoot: {
                        newRoot: "$visaType",
                    },
                },
            ]);

            if (!visaTypes || visaTypes.length < 1) {
                return sendErrorResponse(res, 400, "No Visa Types Found ");
            }

            visaTypes = visaTypes?.map((visaType) => {
                let { adultPrice, childPrice, markupSubAgent, markupClient } = visaType;

                if (req.reseller.role == "sub-agent") {
                    if (subAgentMarkup) {
                        if (markupSubAgent?.markupType === "percentage") {
                            const markupAmount = markupSubAgent.markup / 100;
                            adultPrice = adultPrice * (1 + markupAmount);
                            childPrice = childPrice * (1 + markupAmount);
                        } else if (markupSubAgent.markupType === "flat") {
                            childPrice = childPrice + markupSubAgent.markup;
                            adultPrice = adultPrice + markupSubAgent.markup;
                        }
                    }
                }

                if (markupClient) {
                    if (markupClient?.markupType === "percentage") {
                        const markupAmount = markupClient.markup / 100;
                        adultPrice *= 1 + markupAmount;
                        childPrice *= 1 + markupAmount;
                    } else if (markupClient?.markupType === "flat") {
                        adultPrice += markupClient.markup;
                        childPrice += markupClient.markup;
                    }
                }

                delete visaType.markupClient;
                delete visaType.markupSubAgent;
                delete visaType.b2bMarkupProfile;

                return {
                    ...visaType,
                    adultPrice,
                    childPrice,
                };
            });

            res.status(200).json({
                visa,
                visaTypes,
            });
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    listAll: async (req, res) => {
        try {
            const { search } = req.query;

            let query = {};

            if (search && search !== "") {
                query.country = { $regex: search, $options: "i" };
            }

            let visaType = await VisaType.aggregate([
                {
                    $match: {
                        isDeleted: false,
                    },
                },
                {
                    $lookup: {
                        from: "visas",
                        localField: "visa",
                        foreignField: "_id",
                        as: "visa",
                    },
                },
                {
                    $lookup: {
                        from: "b2bmarkupprofiles",
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        // $and: [
                                        //   {
                                        $eq: [
                                            "$resellerId",
                                            {
                                                $cond: {
                                                    if: {
                                                        $eq: [req.reseller.role, "sub-agent"],
                                                    },
                                                    then: req.reseller?.referredBy,
                                                    else: req.reseller?._id,
                                                },
                                            },
                                            //   ],
                                            // },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "b2bMarkupProfile",
                    },
                },
                {
                    $lookup: {
                        from: "b2bspecialvisamarkups",
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: [
                                                    "$resellerId",
                                                    {
                                                        $cond: {
                                                            if: {
                                                                $eq: [
                                                                    req.reseller.role,
                                                                    "sub-agent",
                                                                ],
                                                            },
                                                            then: req.reseller?.referredBy,
                                                            else: req.reseller?._id,
                                                        },
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "specialMarkup",
                    },
                },
                {
                    $lookup: {
                        from: "b2bclientvisamarkups",
                        let: {
                            visaType: "$_id",
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ["$resellerId", req.reseller._id],
                                            },
                                            {
                                                $eq: ["$visaType", "$$visaType"],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "markupClient",
                    },
                },
                {
                    $lookup: {
                        from: "b2bsubagentvisamarkups",
                        let: {
                            visaType: "$_id",
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ["$resellerId", req.reseller._id],
                                            },
                                            {
                                                $eq: ["$visaType", "$$visaType"],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "markupSubAgent",
                    },
                },
                {
                    $lookup: {
                        from: "b2bsubagentvisamarkups",
                        let: {
                            visaType: "$_id",
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ["$resellerId", req.reseller.referredBy],
                                            },
                                            {
                                                $eq: ["$visaType", "$$visaType"],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "markupAddSubAgent",
                    },
                },
                {
                    $lookup: {
                        from: "countries",
                        localField: "visa.country",
                        foreignField: "_id",
                        as: "country",
                    },
                },
                {
                    $set: {
                        visa: { $arrayElemAt: ["$country.countryName", 0] },
                        markupClient: { $arrayElemAt: ["$markupClient", 0] },
                        b2bMarkupProfile: { $arrayElemAt: ["$b2bMarkupProfile", 0] },
                        markupSubAgent: {
                            $arrayElemAt: ["$markupSubAgent", 0],
                        },
                        country: { $arrayElemAt: ["$country.countryName", 0] },
                    },
                },
                {
                    $match: query,
                },
            ]);

            if (!visaType) {
                return sendErrorResponse(res, 400, "No visaType Available");
            }

            visaType = visaType.map((visaType) => {
                let { visaPrice } = visaType;
                if (req.reseller.role == "sub-agent") {
                    const subAgentMarkup = visaType?.markupAddSubAgent?.find(
                        (markup) => markup?.visaType?.toString() == visaType._id?.toString()
                    );

                    if (subAgentMarkup) {
                        if (subAgentMarkup.markupType === "percentage") {
                            const markupAmount = subAgentMarkup.markup / 100;
                            visaPrice = visaPrice * (1 + markupAmount);
                        } else if (subAgentMarkup.markupType === "flat") {
                            visaPrice = visaPrice + subAgentMarkup.markup;
                        }
                    }
                }

                delete visaType.markupAddSubAgent;
                delete visaType.b2bMarkupProfile;

                return {
                    ...visaType,
                    visaPrice,
                };
            });

            res.status(200).json(visaType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
