const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const {
    Vehicle,
    VehicleMake,
    VehicleModel,
    VehicleTrim,
    VehicleCategory,
} = require("../../../models/transfer");
const { admVehicleSchema } = require("../../validations/transfer/admVehicle.schema");
const { VehicleType } = require("../../../models");

module.exports = {
    addNewVehicle: async (req, res) => {
        try {
            const { vehicleMake, vehicleModel, vehicleTrim, vehicleCategory, vehicleType } =
                req.body;

            const { _, error } = admVehicleSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(vehicleMake)) {
                return sendErrorResponse(res, 400, "invalid vehicle make id");
            }
            const vehcileMakeDetail = await VehicleMake.findById(vehicleMake).lean();
            if (!vehcileMakeDetail) {
                return sendErrorResponse(res, 400, "vehicle make not found");
            }

            if (!isValidObjectId(vehicleModel)) {
                return sendErrorResponse(res, 400, "invalid vehicle model id");
            }
            const vehcileModelDetail = await VehicleModel.findOne({
                _id: vehicleModel,
                vehicleMake,
            }).lean();
            if (!vehcileModelDetail) {
                return sendErrorResponse(res, 400, "vehicle model not found");
            }

            if (!isValidObjectId(vehicleTrim)) {
                return sendErrorResponse(res, 400, "invalid vehicle trim id");
            }
            const vehcileTrimDetail = await VehicleTrim.findOne({
                _id: vehicleTrim,
                vehicleModel,
            }).lean();
            if (!vehcileTrimDetail) {
                return sendErrorResponse(res, 400, "vehicle trim not found");
            }

            if (!isValidObjectId(vehicleCategory)) {
                return sendErrorResponse(res, 400, "invalid vehicle catrgory id");
            }
            const vehcileCategoryDetail = await VehicleCategory.findById(vehicleCategory).lean();
            if (!vehcileCategoryDetail) {
                return sendErrorResponse(res, 404, "vehicle category not found");
            }

            if (!isValidObjectId(vehicleType)) {
                return sendErrorResponse(res, 400, "invalid vehicle sub category id");
            }
            const vehcileTypeDetail = await VehicleType.findOne({
                _id: vehicleType,
                vehicleCategoryId: vehicleCategory,
            }).lean();
            if (!vehcileTypeDetail) {
                return sendErrorResponse(res, 400, "vehicle sub category not found");
            }

            const newVehicle = new Vehicle({
                ...req.body,
            });
            await newVehicle.save();

            res.status(200).json(newVehicle);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVehicle: async (req, res) => {
        try {
            const { id } = req.params;
            const { vehicleMake, vehicleModel, vehicleTrim, vehicleCategory, vehicleType } =
                req.body;

            const { _, error } = admVehicleSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(vehicleMake)) {
                return sendErrorResponse(res, 400, "invalid vehicle make id");
            }
            const vehcileMakeDetail = await VehicleMake.findById(vehicleMake).lean();
            if (!vehcileMakeDetail) {
                return sendErrorResponse(res, 400, "vehicle make not found");
            }

            if (!isValidObjectId(vehicleModel)) {
                return sendErrorResponse(res, 400, "invalid vehicle model id");
            }
            const vehcileModelDetail = await VehicleModel.findOne({
                _id: vehicleModel,
                vehicleMake,
            }).lean();
            if (!vehcileModelDetail) {
                return sendErrorResponse(res, 400, "vehicle model not found");
            }

            if (!isValidObjectId(vehicleTrim)) {
                return sendErrorResponse(res, 400, "invalid vehicle trim id");
            }
            const vehcileTrimDetail = await VehicleTrim.findOne({
                _id: vehicleTrim,
                vehicleModel,
            }).lean();
            if (!vehcileTrimDetail) {
                return sendErrorResponse(res, 400, "vehicle trim not found");
            }

            if (!isValidObjectId(vehicleCategory)) {
                return sendErrorResponse(res, 400, "invalid vehicle catrgory id");
            }
            const vehcileCategoryDetail = await VehicleCategory.findById(vehicleCategory).lean();
            if (!vehcileCategoryDetail) {
                return sendErrorResponse(res, 404, "vehicle category not found");
            }

            if (!isValidObjectId(vehicleType)) {
                return sendErrorResponse(res, 400, "invalid vehicle sub category id");
            }
            const vehcileSubCategoryDetail = await VehicleType.findOne({
                _id: vehicleType,
                vehicleCategoryId: vehicleCategory,
            }).lean();
            if (!vehcileSubCategoryDetail) {
                return sendErrorResponse(res, 400, "vehicle sub category not found");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle id");
            }
            const vehicle = await Vehicle.findOneAndUpdate(
                { _id: id },
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!vehicle) {
                return sendErrorResponse(res, 400, "vehicle not found");
            }

            res.status(200).json(vehicle);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteVehicle: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle id");
            }
            const vehicle = await Vehicle.findByIdAndDelete(id);
            if (!vehicle) {
                return sendErrorResponse(res, 400, "vehicle not found");
            }

            res.status(200).json({
                message: "vehicle successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllVehicles: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const vehicles = await Vehicle.find({})
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .populate("vehicleMake", "companyName")
                .populate("vehicleModel", "modelName")
                .populate("vehicleTrim", "trimName")
                .populate("vehicleCategory", "categoryName")
                .populate("vehicleType", "name")
                .lean();

            const totalVehicles = await Vehicle.count();

            res.status(200).json({
                totalVehicles,
                skip: Number(skip),
                limit: Number(limit),
                vehicles,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingelVehicle: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle id");
            }
            const vehicle = await Vehicle.findById(id).lean();
            if (!vehicle) {
                return sendErrorResponse(res, 400, "vehicle not found");
            }

            res.status(200).json(vehicle);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getVehiclesInitialData: async (req, res) => {
        try {
            const vehicleMakes = await VehicleMake.find({}).sort({ createdAt: -1 }).lean();
            const vehicleModels = await VehicleModel.find({}).sort({ createdAt: -1 }).lean();
            const vehicleTrims = await VehicleTrim.find({}).sort({ createdAt: -1 }).lean();
            const vehicleCategories = await VehicleCategory.find({}).sort({ createdAt: -1 }).lean();
            const vehicleTypes = await VehicleType.find({}).sort({ createdAt: -1 }).lean();

            res.status(200).json({
                vehicleMakes,
                vehicleModels,
                vehicleTrims,
                vehicleCategories,
                vehicleTypes,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
