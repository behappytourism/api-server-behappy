const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const {
    VehicleModel,
    VehicleMake,
    VehicleBodyType,
    VehicleTrim,
} = require("../../../models/transfer");
const { admVehicleModelSchema } = require("../../validations/transfer/admVehicleModelSchema");

module.exports = {
    addNewVehicleModel: async (req, res) => {
        try {
            const { vehicleMake, bodyType } = req.body;

            const { error } = admVehicleModelSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            let vehicleImage;
            if (req.file?.path) {
                vehicleImage = "/" + req.file.path.replace(/\\/g, "/");
            }

            if (!isValidObjectId(vehicleMake)) {
                return sendErrorResponse(res, 400, "invalid vehicle make id");
            }
            const vehicleMakeDetail = await VehicleMake.findById(vehicleMake).lean();
            if (!vehicleMakeDetail) {
                return sendErrorResponse(res, 400, "vehicle make not found");
            }

            if (!isValidObjectId(bodyType)) {
                return sendErrorResponse(res, 400, "invalid body type id");
            }
            const bodyTypeDetail = await VehicleBodyType.findById(bodyType).lean();
            if (!bodyTypeDetail) {
                return sendErrorResponse(res, 400, "vehicle body type not found");
            }

            const newVehicleModel = new VehicleModel({
                ...req.body,
                vehicleImage,
            });
            await newVehicleModel.save();

            const tempVehicleModel = JSON.parse(JSON.stringify(newVehicleModel));
            tempVehicleModel.vehicleMake = {
                _id: vehicleMakeDetail?._id,
                companyName: vehicleMakeDetail?.companyName,
            };
            tempVehicleModel.bodyType = {
                _id: bodyTypeDetail?._id,
                bodyType: bodyTypeDetail?.bodyType,
            };

            res.status(200).json(tempVehicleModel);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVehicleModel: async (req, res) => {
        try {
            const { id } = req.params;
            const { vehicleMake, bodyType } = req.body;

            const { error } = admVehicleModelSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            let vehicleImage;
            if (req.file?.path) {
                vehicleImage = "/" + req.file.path.replace(/\\/g, "/");
            }

            if (!isValidObjectId(vehicleMake)) {
                return sendErrorResponse(res, 400, "invalid vehicle make id");
            }
            const vehicleMakeDetail = await VehicleMake.findById(vehicleMake).lean();
            if (!vehicleMakeDetail) {
                return sendErrorResponse(res, 400, "vehicle make not found");
            }

            if (!isValidObjectId(bodyType)) {
                return sendErrorResponse(res, 400, "invalid body type id");
            }
            const bodyTypeDetail = await VehicleBodyType.findById(bodyType).lean();
            if (!bodyTypeDetail) {
                return sendErrorResponse(res, 400, "vehicle body type not found");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle model id");
            }
            const vehicleModel = await VehicleModel.findByIdAndUpdate(
                id,
                { ...req.body, vehicleImage },
                { runValidators: true, new: true }
            );
            if (!vehicleModel) {
                return sendErrorResponse(res, 400, "vehicle model not found");
            }

            const tempVehicleModel = JSON.parse(JSON.stringify(vehicleModel));
            tempVehicleModel.vehicleMake = {
                _id: vehicleMakeDetail?._id,
                companyName: vehicleMakeDetail?.companyName,
            };
            tempVehicleModel.bodyType = {
                _id: bodyTypeDetail?._id,
                bodyType: bodyTypeDetail?.bodyType,
            };

            res.status(200).json(tempVehicleModel);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteVehicleModel: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle model id");
            }
            const vehicleModel = await VehicleModel.findByIdAndDelete(id);
            if (!vehicleModel) {
                return sendErrorResponse(res, 400, "vehicle model not found");
            }

            res.status(200).json({ message: "vehicle model successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllVehicleModels: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const vehicleModels = await VehicleModel.find({})
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .populate("vehicleMake", "companyName")
                .populate("bodyType", "bodyType")
                .lean();

            const totalVehicleModels = await VehicleModel.count();

            res.status(200).json({
                totalVehicleModels,
                skip: Number(skip),
                limit: Number(limit),
                vehicleModels,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleVehicleModelTrims: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle model id");
            }
            const vehicleModel = await VehicleModel.findById(id);
            if (!vehicleModel) {
                return sendErrorResponse(res, 400, "vehicle model not found");
            }

            const vehicleTrims = await VehicleTrim.find({ vehicleModel: id })
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({ vehicleModel, vehicleTrims });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
