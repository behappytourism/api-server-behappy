const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { VehicleMake, VehicleModel } = require("../../../models/transfer");
const { admVehicleMakeSchema } = require("../../validations/transfer/admVehicleMakeSchema");

module.exports = {
    addNewVehicleMake: async (req, res) => {
        try {
            const { error } = admVehicleMakeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            const newVehicleMake = new VehicleMake({ ...req.body });
            await newVehicleMake.save();

            res.status(200).json(newVehicleMake);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVehicleMake: async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = admVehicleMakeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle make id");
            }
            const vehicleMake = await VehicleMake.findByIdAndUpdate(
                id,
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!vehicleMake) {
                return sendErrorResponse(res, 400, "vehicle make not found");
            }

            res.status(200).json(vehicleMake);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteVehicleMake: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle make id");
            }
            const vehicleMake = await VehicleMake.findByIdAndDelete(id);
            if (!vehicleMake) {
                return sendErrorResponse(res, 400, "vehicle make not found");
            }

            res.status(200).json({ message: "vehicle make successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllVehicleMakes: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const vehicleMakes = await VehicleMake.find({})
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalVehicleMakes = await VehicleMake.count();

            res.status(200).json({
                totalVehicleMakes,
                skip: Number(skip),
                limit: Number(limit),
                vehicleMakes,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleMakesModels: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vehicle make id");
            }
            const vehicleMake = await VehicleMake.findById(id).lean();
            if (!vehicleMake) {
                return sendErrorResponse(res, 400, "vehicle make not found");
            }

            const vehicleModels = await VehicleModel.find({ vehicleMake: id })
                .populate("bodyType", "bodyType")
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({ vehicleMake, vehicleModels });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
