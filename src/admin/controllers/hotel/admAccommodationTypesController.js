const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { AccommodationType } = require("../../../models/hotel");
const { accommodationTypeSchema } = require("../../validations/hotel/accommodationType.schema");

module.exports = {
    addNewAccommodationType: async (req, res) => {
        try {
            const { accommodationTypeCode } = req.body;

            const { _, error } = accommodationTypeSchema.validate(req.body);
            if (error) {
                sendErrorResponse(res, 400, error.details[0].message);
            }

            const exAccommodationType = await AccommodationType.findOne({
                accommodationTypeCode: accommodationTypeCode?.toUpperCase(),
            });
            if (exAccommodationType) {
                return sendErrorResponse(res, 400, "accommodation type code already exists");
            }

            const newAccommodationType = new AccommodationType({
                ...req.body,
            });
            await newAccommodationType.save();

            res.status(200).json(newAccommodationType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAccommodationType: async (req, res) => {
        try {
            const { accId } = req.params;
            const { accommodationTypeCode } = req.body;

            if (!isValidObjectId(accId)) {
                return sendErrorResponse(res, 400, "invalid accommodation type id");
            }

            const { _, error } = accommodationTypeSchema.validate(req.body);
            if (error) {
                sendErrorResponse(res, 400, error.details[0].message);
            }

            const exAccommodationType = await AccommodationType.findOne({
                accommodationTypeCode: accommodationTypeCode?.toUpperCase(),
                _id: { $ne: accId },
            });
            if (exAccommodationType) {
                return sendErrorResponse(res, 400, "accommodation type code already exists");
            }

            const accommodationType = await AccommodationType.findOneAndUpdate(
                { _id: accId },
                {
                    ...req.body,
                },
                { runValidators: true, new: true }
            );

            res.status(200).json(accommodationType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteAccommodationType: async (req, res) => {
        try {
            const { accId } = req.params;

            if (!isValidObjectId(accId)) {
                return sendErrorResponse(res, 400, "invalid accommodation type id");
            }

            const accommodationType = await AccommodationType.findByIdAndDelete(accId);
            if (!accommodationType) {
                return sendErrorResponse(res, 404, "accommodation type not found");
            }

            res.status(200).json({
                message: "accommodation type deleted successfully",
                _id: accId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllAccommodationTypes: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = {};
            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    { accommodationTypeCode: { $regex: searchQuery, $options: "i" } },
                    { accommodationTypeName: { $regex: searchQuery, $options: "i" } },
                ];
            }

            const accommodationTypes = await AccommodationType.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalAccommodationTypes = await AccommodationType.find(filters).count();

            res.status(200).json({
                accommodationTypes,
                totalAccommodationTypes,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
