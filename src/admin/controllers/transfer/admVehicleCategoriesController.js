const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { VehicleType } = require("../../../models");
const { VehicleCategory } = require("../../../models/transfer");
const { vehicleCategorySchema } = require("../../validations/transfer/vehicleCategory.schema");

module.exports = {
    addVehicleCategory: async (req, res) => {
        try {
            const { _, error } = vehicleCategorySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const newVehicleCategory = new VehicleCategory({
                ...req.body,
            });
            await newVehicleCategory.save();

            res.status(200).json(newVehicleCategory);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVehicleCategory: async (req, res) => {
        try {
            const { id } = req.params;

            const { _, error } = vehicleCategorySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle category idF");
            }

            const vehicleCategory = await VehicleCategory.findOneAndUpdate(
                { _id: id },
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!vehicleCategory) {
                return sendErrorResponse(res, 404, "vehicle category not found");
            }

            res.status(200).json(vehicleCategory);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteVehicleCategory: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle category id");
            }
            const vehicleCategory = await VehicleCategory.findByIdAndDelete(id);
            if (!vehicleCategory) {
                return sendErrorResponse(res, 404, "vehicle category not found");
            }

            await VehicleType.deleteMany({ vehicleCategoryId: id });

            res.status(200).json({
                message: "vehicle category successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllVehicleCategories: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const vehicleCategories = await VehicleCategory.find({})
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalVehicleCategories = await VehicleCategory.count();

            res.status(200).json({
                totalVehicleCategories,
                skip: Number(skip),
                limit: Number(limit),
                vehicleCategories,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleCatVehicleTypes: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle category id");
            }
            const vehicleCategory = await VehicleCategory.findById(id);
            if (!vehicleCategory) {
                return sendErrorResponse(res, 404, "vehicle category not found");
            }

            const vehicleTypes = await VehicleType.find({
                vehicleCategoryId: id,
            })
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({ vehicleCategory, vehicleTypes });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
