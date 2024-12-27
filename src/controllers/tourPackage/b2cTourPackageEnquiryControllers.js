const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../helpers");
const { TourPackage } = require("../../models/tourPackage");
const { B2BTourPackageEnquiry, B2CTourPackageEnquiry } = require("../../models/tourPackage");
const { tourPackageSchema } = require("../../validations/tourPackage/tourPackage.schema");
const { Country } = require("../../models");

module.exports = {
    createNewTourPackageEnquiry: async (req, res) => {
        try {
            const { tourPackageId, countryCode } = req.body;

            const { error } = tourPackageSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(tourPackageId)) {
                return sendErrorResponse(res, 400, "invalid tour package id");
            }
            const tourPackage = await TourPackage.findOne({
                _id: tourPackageId,
                isDeleted: false,
            }).lean();
            if (!tourPackage) {
                return sendErrorResponse(res, 400, "tour package not found");
            }

            const country = await Country.findOne({ isocode: countryCode.toUpperCase() }).lean();
            if (!country) {
                return sendErrorResponse(res, 400, "country not found");
            }

            const newTourPackageEnquiry = new B2CTourPackageEnquiry({
                ...req.body,
            });
            await newTourPackageEnquiry.save();

            res.status(200).json(newTourPackageEnquiry);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllTourPackageEnquiries: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const packageEnquiries = await B2BTourPackageEnquiry.find({
                resellerId: req.reseller._id,
            })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalPackageEnquiries = await B2BTourPackageEnquiry.find({
                resellerId: req.reseller._id,
            }).count();

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
