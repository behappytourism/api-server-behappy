const { isValidObjectId } = require("mongoose");

const {
    visaNationalitySchema,
    editVisaNationalitySchema,
} = require("../../validations/admVisaNationality.schema");
const { VisaType, VisaNationality, Country } = require("../../../models");
const { B2cClientVisaMarkup } = require("../../../models");
const { sendErrorResponse } = require("../../../helpers");

module.exports = {
    addVisaNationality: async (req, res) => {
        try {
            const { nationality, requestedBy } = req.body;

            // const { _, error } = visaNationalitySchema.validate(req.body);
            // if (error) {
            //     return sendErrorResponse(res, 400, error.details[0]?.message);
            // }

            if (!isValidObjectId(nationality)) {
                return sendErrorResponse(res, 400, "Invalid visaType id");
            }

            let country = await Country.findOne({ _id: nationality, isDeleted: false });

            if (!country) {
                return sendErrorResponse(res, 400, "Country not found");
            }

            const selectedNationality = await VisaNationality.findOne({
                nationality,
                requestedBy,
                isDeleted: false,
            });

            if (selectedNationality) {
                return sendErrorResponse(res, 400, "nationality already added ");
            }

            let slug = country?.countryName?.toLowerCase().replace(/\s+/g, "-");

            const newVisaNationality = new VisaNationality({
                nationality,
                requestedBy,
                slug,
            });

            await newVisaNationality.save();

            res.status(200).json({ _id: newVisaNationality._id, message: "created successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllVisaNationality: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery = "" } = req.query;

            const filter = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filter.slug = { $regex: searchQuery, $options: "i" };
            }

            const visaNationalities = await VisaNationality.find(filter)
                .populate({
                    path: "nationality",
                    select: "countryName",
                })
                .sort({
                    slug: 1,
                })
                .limit(limit)
                .skip(limit * skip);

            if (!visaNationalities || visaNationalities.length < 1) {
                return sendErrorResponse(res, 400, "No Visa Enquiries Found ");
            }

            const totalVisaNationalities = await VisaNationality.find({ isDeleted: false }).count();

            res.status(200).json({
                visaNationalities,
                totalVisaNationalities,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
            console.log(err);
        }
    },

    getAllNationalityVisaTypes: async (req, res) => {
        try {
            const { id, createdFor } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid visaType id");
            }

            let visaNationalities = await VisaNationality.findOne({
                _id: id,
                isDeleted: false,
            })
                .populate({
                    path: "visas", // Correct the field name to match your schema
                    match: { isDeleted: false }, // Use the field name directly
                    populate: {
                        path: "visaType",
                        select: "visaName",
                    },
                })
                .exec();

            if (!visaNationalities) {
                return sendErrorResponse(res, 400, "Visa Nationality Found ");
            }

            if (!visaNationalities?.visas || visaNationalities?.visas.length < 1) {
                return sendErrorResponse(res, 400, "No Visa Types Found ");
            }

            let visas = visaNationalities.visas
                .filter(
                    (visa) =>
                        !visa.isDeleted &&
                        visa?.createdFor.toLocaleLowerCase() === createdFor.toLocaleLowerCase()
                ) // Filter out visas with isDeleted = true
                .map((visa) => ({
                    visaId: visa.visaType._id,
                    visaName: visa.visaType.visaName,
                    adultPrice: visa.adultPrice,
                    childPrice: visa.childPrice,
                    adultCost: visa.adultCost,
                    childCost: visa.childCost,
                }));

            res.status(200).json({
                visaTypes: visas,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addVisaTypeNationality: async (req, res) => {
        try {
            const { nationality, adultPrice, childPrice, visaType, adultCost, childCost, section } =
                req.body;

            console.log(visaType, nationality, "visaType");

            const visaNationality = await VisaNationality.findOne({
                _id: nationality,
                isDeleted: false,
            });

            if (!visaNationality) {
                return sendErrorResponse(res, 404, "visa nationality not found");
            }

            if (visaNationality) {
                let existingIndex = visaNationality?.visas?.findIndex((visa) => {
                    return (
                        visa?.visaType?.toString() === visaType?.toString() &&
                        visa?.createdFor?.toString() === section?.toString()
                    );
                });

                if (existingIndex !== -1) {
                    return sendErrorResponse(res, 404, "visa type already added");
                } else {
                    visaNationality.visas.push({
                        adultPrice,
                        childPrice,
                        visaType,
                        adultCost,
                        childCost,
                        createdFor: section,
                    });
                }
            }

            console.log("visa Nationality", visaNationality);

            await visaNationality.save();

            res.status(200).json({
                _id: visaNationality._id,
                message: "new visa types added successfully",
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    updateVisaTypeNationality: async (req, res) => {
        try {
            const {
                nationality,
                adultPrice,
                childPrice,
                visaType,
                adultCost,
                childCost,
                createdFor,
            } = req.body;

            const visaNationality = await VisaNationality.findOne({
                _id: nationality,
                isDeleted: false,
            });

            if (!visaNationality) {
                return sendErrorResponse(res, 404, "visa nationality not found");
            }

            if (visaNationality) {
                let existingIndex = visaNationality?.visas?.findIndex((visa) => {
                    return (
                        visa?.visaType?.toString() === visaType?.toString() &&
                        visa?.createdFor?.toString() === createdFor?.toString()
                    );
                });

                if (existingIndex !== -1) {
                    visaNationality.visas[existingIndex].adultCost = adultCost;
                    visaNationality.visas[existingIndex].childCost = childCost;
                    visaNationality.visas[existingIndex].adultPrice = adultPrice;
                    visaNationality.visas[existingIndex].childPrice = childPrice;
                } else {
                    return sendErrorResponse(res, 404, "visa type not found ");
                }
            }

            await visaNationality.save();

            res.status(200).json({
                _id: visaNationality._id,
                message: "visa types edited successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteNationality: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid visaType id");
            }

            const visaNationality = await VisaNationality.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                {
                    isDeleted: true,
                }
            );

            res.status(200).json({ message: "deleted successfully" });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    deleteVisaTypeNationality: async (req, res) => {
        try {
            const { nationalityId, visaTypeId } = req.params;

            const nationality = await VisaNationality.findOneAndUpdate(
                {
                    _id: nationalityId,
                    isDeleted: false,
                    "visas.visaType": visaTypeId,
                    "visas.isDeleted": false,
                },
                {
                    $set: {
                        "visas.$.isDeleted": true,
                    },
                },
                { new: true }
            );

            console.log(nationality, "nationality");

            res.status(200).json({ message: "deleted successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllVisaTypes: async (req, res) => {
        try {
            console.log("calling getAllVisaTypes");
            const visaTypes = await VisaType.find({ isDeleted: false }).populate("visa");

            if (!visaTypes) {
                return sendErrorResponse(res, 400, "visa types not found ");
            }
            res.status(200).json({ visas: visaTypes });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSelectedVisaType: async (req, res) => {
        try {
            console.log("calling getAllVisaTypes");
            const { nationalityId, visaId, createdFor } = req.params;

            const nationality = await VisaNationality.findOne({
                _id: nationalityId,
                isDeleted: false,
                "visas.visaType": visaId,
                "visas.isDeleted": false,
            });

            if (!nationality) {
                return sendErrorResponse(res, 400, "nationality  not found ");
            }

            let visaType = nationality.visas.find((visa) => {
                return (
                    visa.visaType.toString() === visaId.toString() &&
                    visa.createdFor.toLowerCase() === createdFor.toLowerCase()
                );
            });

            if (!visaType) {
                return sendErrorResponse(res, 400, "visa types not found ");
            }

            res.status(200).json(visaType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
