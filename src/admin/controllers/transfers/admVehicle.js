const { sendErrorResponse } = require("../../../helpers");
const { VehicleType } = require("../../../models");
const { Area, City } = require("../../../models/global");

module.exports = {
    getAllVehicles: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const vehicles = await VehicleType.find({ isDeleted: false })
                .sort({
                    createdAt: -1,
                })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const total = await VehicleType.findOne({
                isDeleted: false,
            }).count();

            res.status(200).json({
                vehicles,
                total,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addNewVehicle: async (req, res) => {
        try {
            const { name, normalOccupancy, airportOccupancy, vehicleType } = req.body;

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            } else {
                return sendErrorResponse(res, 400, "image is required");
            }

            const newVehicle = new VehicleType({
                name,
                normalOccupancy,
                airportOccupancy,
                image,
                vehicleType,
            });
            await newVehicle.save();

            res.status(200).json({
                message: "New vehicle successfully created",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteVehicle: async (req, res) => {
        try {
            const { id } = req.params;

            const transfer = await VehicleType.findOneAndDelete({
                _id: id,
            });
            if (!transfer) {
                return sendErrorResponse(res, 404, "Vehicle not found");
            }

            res.status(200).json({ message: "Vehicle successfully deleted" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleVehicle: async (req, res) => {
        try {
            const { id } = req.params;

            const transfer = await VehicleType.findById(id);
            if (!transfer) {
                return sendErrorResponse(res, 404, "Transfer not found");
            }

            res.status(200).json(transfer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVehicle: async (req, res) => {
        try {
            const { id } = req.params;

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            const vehicleCategory = await VehicleType.findOneAndUpdate(
                { _id: id },
                {
                    ...req.body,
                    image,
                },
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
    listAllVehicles: async (req, res) => {
        try {
            const vehicles = await VehicleType.find({ isDeleted: false }).sort({
                createdAt: -1,
            });

            res.status(200).json(vehicles);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
