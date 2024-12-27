const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { HotelStarCategory } = require("../../../models/hotel");
const { hotelStarCategorySchema } = require("../../validations/hotel/hotelStarCategory.schema");

module.exports = {
    addStarCategory: async (req, res) => {
        try {
            const { categoryCode } = req.body;

            const { _, error } = hotelStarCategorySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const exStarCategory = await HotelStarCategory.findOne({
                categoryCode: categoryCode?.toUpperCase(),
            });
            if (exStarCategory) {
                return sendErrorResponse(
                    res,
                    400,
                    "already a star category exists with this categoryCode"
                );
            }

            const newStarCategory = new HotelStarCategory({
                ...req.body,
            });
            await newStarCategory.save();

            res.status(200).json(newStarCategory);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateStarCategory: async (req, res) => {
        try {
            const { id } = req.params;
            const { categoryCode } = req.body;

            const { _, error } = hotelStarCategorySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const exStarCategory = await HotelStarCategory.findOne({
                categoryCode: categoryCode?.toUpperCase(),
                _id: { $ne: id },
            });
            if (exStarCategory) {
                return sendErrorResponse(
                    res,
                    400,
                    "already a star category exists with this categoryCode"
                );
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid star category id");
            }

            const starCategory = await HotelStarCategory.findOneAndUpdate(
                { _id: id },
                { ...req.body },
                {
                    new: true,
                    runValidators: true,
                }
            );
            if (!starCategory) {
                return sendErrorResponse(res, 404, "star category not found");
            }

            res.status(200).json(starCategory);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteStarCategory: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid star category id");
            }

            const starCategory = await HotelStarCategory.findOneAndDelete({ _id: id });
            if (!starCategory) {
                return sendErrorResponse(res, 404, "star category not found");
            }

            res.status(200).json({ message: "hotel star category successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllStarCategories: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = {};
            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    { categoryCode: { $regex: searchQuery, $options: "i" } },
                    { categoryName: { $regex: searchQuery, $options: "i" } },
                ];
            }

            const starCategories = await HotelStarCategory.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalStarCategories = await HotelStarCategory.find(filters).count();

            res.status(200).json({
                starCategories,
                totalStarCategories,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
