const { sendErrorResponse } = require("../../helpers");
const { Visa, VisaType, VisaNationality } = require("../../models");
const { isValidObjectId, Types } = require("mongoose");

module.exports = {
    listVisa: async (req, res) => {
        try {
            // const { countryName} = req.query

            const visaCountry = await Visa.find({ isDeleted: false })
                .populate({
                    path: "country",
                    select: "countryName",
                })
                .select("slug");

            if (!visaCountry) {
                return sendErrorResponse(res, 400, "No Visa Available");
            }

            //   const filteredVisaCountry = visaCountry.filter(visa => {
            //     return visa.country.countryName.match(new RegExp(countryName, "i"));
            // });

            // if (!filteredVisaCountry) {
            //   return sendErrorResponse(res, 400, "No Visa Available");
            // }

            res.status(200).json(visaCountry);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listVisaType: async (req, res) => {
        try {
            const { visaId, nationalityId } = req.params;

            const visa = await Visa.findOne({ slug: visaId, isDeleted: false }).populate({
                path: "country",
                select: "countryName",
            });

            if (!visa) {
                return sendErrorResponse(res, 400, "No visa found ");
            }

            let visaTypes = await VisaNationality.aggregate([
                {
                    $match: {
                        slug: nationalityId,
                        isDeleted: false,
                    },
                },
                {
                    $unwind: "$visas",
                },
                {
                    $match: {
                        "visas.isDeleted": false,
                        "visas.createdFor": "b2c",
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
                    $replaceRoot: {
                        newRoot: "$visaType",
                    },
                },
                {
                    $sort: {
                        createdAt: -1,
                    },
                },
            ]);

            if (!visaTypes || visaTypes.length < 1) {
                return sendErrorResponse(res, 400, "No Visa Types Found ");
            }
            res.status(200).json({ visaTypes, visa });
        } catch (err) {
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
};
