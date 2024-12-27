const { isValidObjectId } = require("mongoose");

const { VehicleType, VehicleCategory } = require("../../../models/transfer");
const { vehicleTypeSchema } = require("../../validations/transfer/vehicleType.schema");
const { sendErrorResponse } = require("../../../helpers");

module.exports = {
    addVehicleType: async (req, res) => {
        try {
            const { vehicleCategory } = req.body;

            const { _, error } = vehicleTypeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(vehicleCategory)) {
                return sendErrorResponse(res, 400, "invalid vehicle category id");
            }

            const vehicleCategoryDetail = await VehicleCategory.findOne({
                _id: vehicleCategory,
            });
            if (!vehicleCategoryDetail) {
                return sendErrorResponse(res, 404, "vehicle category not found");
            }

            const newVehicleType = new VehicleType({
                ...req.body,
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
            const { vehicleCategory } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle type id");
            }

            const { _, error } = vehicleTypeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(vehicleCategory)) {
                return sendErrorResponse(res, 400, "invalid vehicle category id");
            }

            const vehicleCategoryDetail = await VehicleCategory.findOne({
                _id: vehicleCategory,
            });
            if (!vehicleCategoryDetail) {
                return sendErrorResponse(res, 404, "vehicle category not found");
            }

            const vehicleType = await VehicleType.findOneAndUpdate(
                {
                    _id: id,
                },
                { ...req.body },
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
                return sendErrorResponse(res, 400, "invalid vehicle type id");
            }

            const vehicleType = await VehicleType.findByIdAndDelete(id);
            if (!vehicleType) {
                return sendErrorResponse(res, 404, "vehicle type not found");
            }

            res.status(200).json({
                message: "vehicle type successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllVehicleTypes: async (req, res) => {
        try {
            const vehicleTypes = await VehicleType.find({}).sort({
                createdAt: -1,
            });

            res.status(200).json(vehicleTypes);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
