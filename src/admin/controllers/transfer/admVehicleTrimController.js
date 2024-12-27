const { isValidObjectId } = require("mongoose");

const { VehicleTrim, VehicleModel } = require("../../../models/transfer");
const { admVehicleTrimSchema } = require("../../validations/transfer/admVehicleTrimSchema");
const { sendErrorResponse } = require("../../../helpers");

module.exports = {
    addNewVehicleTrim: async (req, res) => {
        try {
            const { vehicleModel } = req.body;

            const { error } = admVehicleTrimSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(vehicleModel)) {
                return sendErrorResponse(res, 400, "invalid vehicle model");
            }
            const vehicleModelDetail = await VehicleModel.findById(vehicleModel).lean();
            if (!vehicleModelDetail) {
                return sendErrorResponse(res, 400, "vehicle model not found");
            }

            const newVehicleTrim = new VehicleTrim({
                ...req.body,
            });
            await newVehicleTrim.save();

            const tempVehicleTrim = JSON.parse(JSON.stringify(newVehicleTrim));
            tempVehicleTrim.vehicleModel = {
                _id: vehicleModelDetail?._id,
                modelName: vehicleModelDetail?.modelName,
            };

            res.status(200).json(tempVehicleTrim);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVehicleTrim: async (req, res) => {
        try {
            const { id } = req.params;
            const { vehicleModel } = req.body;

            const { error } = admVehicleTrimSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(vehicleModel)) {
                return sendErrorResponse(res, 400, "invalid vehicle model");
            }
            const vehicleModelDetail = await VehicleModel.findById(vehicleModel).lean();
            if (!vehicleModelDetail) {
                return sendErrorResponse(res, 400, "vehicle model not found");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "ivalid vehicle trim id");
            }
            const vehicleTrim = await VehicleTrim.findByIdAndUpdate(
                id,
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!vehicleTrim) {
                return sendErrorResponse(res, 400, "vehicle trim not found");
            }

            const tempVehicleTrim = JSON.parse(JSON.stringify(vehicleTrim));
            tempVehicleTrim.vehicleModel = {
                _id: vehicleModelDetail?._id,
                modelName: vehicleModelDetail?.modelName,
            };

            res.status(200).json(tempVehicleTrim);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteVehicleTrim: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "ivalid vehicle trim id");
            }
            const vehicleTrim = await VehicleTrim.findByIdAndDelete(id);
            if (!vehicleTrim) {
                return sendErrorResponse(res, 400, "vehicle trim not found");
            }

            res.status(200).json({ message: "vehicle trim successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllVehicleTrims: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const vehicleTrims = await VehicleTrim.find({})
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalVehicleTrims = await VehicleTrim.count();

            res.status(200).json({
                totalVehicleTrims,
                skip: Number(skip),
                limit: Number(limit),
                vehicleTrims,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
