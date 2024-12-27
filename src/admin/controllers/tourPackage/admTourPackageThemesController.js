const { isValidObjectId } = require("mongoose");
const { TourPackageTheme } = require("../../../models/tourPackage");
const {
    admTourPackageThemeSchema,
} = require("../../validations/tourPackage/admTourPackageTheme.schema");

module.exports = {
    addNewTourPackageTheme: async (req, res) => {
        try {
            const { error } = admTourPackageThemeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            const newTourPackageTheme = new TourPackageTheme({ ...req.body });
            await newTourPackageTheme.save();

            res.status(200).json(newTourPackageTheme);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateTourPackageTheme: async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = admTourPackageThemeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid tour package id");
            }
            const tourPackageTheme = await TourPackageTheme.findByIdAndUpdate(
                id,
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!tourPackageTheme) {
                return sendErrorResponse(res, 400, "tour package theme not found");
            }

            res.status(200).json(tourPackageTheme);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteTourPackageTheme: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid tour package id");
            }
            const tourPackageTheme = await TourPackageTheme.findByIdAndDelete(id);
            if (!tourPackageTheme) {
                return sendErrorResponse(res, 400, "tour package theme not found");
            }

            res.status(200).json({ message: "tour package theme successfully deleted", id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllTourPackageThemes: async (req, res) => {
        try {
            const tourPackageThemes = await TourPackageTheme.find({})
                .sort({ createdAt: -1 })
                .lean();
                
            res.status(200).json({
                totalTourPackageThemes: tourPackageThemes?.length,
                tourPackageThemes,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
