const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { VehicleType } = require("../../../models");
const { VehicleCategory } = require("../../../models/transfer");
const { admVehicleTypeSchema } = require("../../validations/transfer/admVehicleTypeSchema");

module.exports = {
    addVehicleType: async (req, res) => {
        try {
            const { vehicleCategoryId } = req.body;

            const { _, error } = admVehicleTypeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!req.file?.path) {
                return sendErrorResponse(res, 400, "Image  required");
            }

            if (!isValidObjectId(vehicleCategoryId)) {
                return sendErrorResponse(res, 400, "invalid vehicle category id");
            }
            const vehicleCategory = await VehicleCategory.findById(vehicleCategoryId);
            if (!vehicleCategory) {
                return sendErrorResponse(res, 400, "vehicle category not found");
            }

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            const newVehicleType = new VehicleType({
                ...req.body,
                image: image,
            });
            await newVehicleType.save();

            res.status(200).json(newVehicleType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVehicleType: async (req, res) => {
        try {
            const { id } = req.params;
            const { vehicleCategoryId } = req.body;

            const { _, error } = admVehicleTypeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            console.log("vehicleCategoryId", vehicleCategoryId);

            if (!isValidObjectId(vehicleCategoryId)) {
                return sendErrorResponse(res, 400, "invalid vehicle category id");
            }
            const vehicleCategory = await VehicleCategory.findById(vehicleCategoryId);
            if (!vehicleCategory) {
                return sendErrorResponse(res, 400, "vehicle category not found");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle type id");
            }
            const vehicleType = await VehicleType.findOneAndUpdate(
                { _id: id },
                { ...req.body, image: image },
                { runValidators: true, new: true }
            );
            if (!vehicleType) {
                return sendErrorResponse(res, 404, "vehicle type not found");
            }

            res.status(200).json(vehicleType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteVehicleType: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle sub category id");
            }

            const vehicleType = await VehicleType.findByIdAndDelete(id);
            if (!vehicleType) {
                return sendErrorResponse(res, 404, "vehicle sub category not found");
            }

            res.status(200).json({
                message: "vehicle type successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllVehicleType: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const vehicleTypes = await VehicleType.find({})
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalVehicleTypes = await VehicleType.count();

            res.status(200).json({
                vehicleTypes,
                skip: Number(skip),
                limit: Number(limit),
                totalVehicleTypes,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
