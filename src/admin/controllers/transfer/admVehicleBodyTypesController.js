const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { VehicleBodyType } = require("../../../models/transfer");
const { admVehicleBodyTypeSchema } = require("../../validations/transfer/admVehicleBodyTypeSchema");

module.exports = {
    addNewVehicleBodyType: async (req, res) => {
        try {
            const { error } = admVehicleBodyTypeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!req.file?.path) {
                return sendErrorResponse(res, 400, "body image is required");
            }
            let bodyImg = "/" + req.file.path.replace(/\\/g, "/");

            const newVehicleBodyType = new VehicleBodyType({
                ...req.body,
                bodyImg,
            });
            await newVehicleBodyType.save();

            res.status(200).json(newVehicleBodyType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVehicleBodyType: async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = admVehicleBodyTypeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            let bodyImg;
            if (req.file?.path) {
                bodyImg = "/" + req.file.path.replace(/\\/g, "/");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid body type id");
            }
            const vehicleBodyType = await VehicleBodyType.findByIdAndUpdate(
                id,
                {
                    ...req.body,
                    bodyImg,
                },
                { runValidators: true, new: true }
            );
            if (!vehicleBodyType) {
                return sendErrorResponse(res, 400, "vehicle body type not found");
            }

            res.status(200).json(vehicleBodyType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteVehicleBodyType: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid body type id");
            }
            const vehicleBodyType = await VehicleBodyType.findByIdAndRemove(id);
            if (!vehicleBodyType) {
                return sendErrorResponse(res, 400, "vehicle body type not found");
            }

            res.status(200).json({ message: "vehicle body type successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllVehicleBodyTypes: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const vehicleBodyTypes = await VehicleBodyType.find({})
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalVehicleBodyTypes = await VehicleBodyType.count();

            res.status(200).json({
                totalVehicleBodyTypes,
                skip: Number(skip),
                limit: Number(limit),
                vehicleBodyTypes,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllBodyTypesNames: async (req, res) => {
        try {
            const vehicleBodyTypes = await VehicleBodyType.find({})
                .select("bodyType")
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json(vehicleBodyTypes);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
