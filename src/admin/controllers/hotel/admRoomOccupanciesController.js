const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { RoomOccupancy } = require("../../../models/hotel");
const { addRoomOccupancySchema } = require("../../validations/hotel/admRoomOccupancy.schema");

module.exports = {
    addNewRoomOccupancy: async (req, res) => {
        try {
            const { error } = addRoomOccupancySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const newRoomOccupancy = new RoomOccupancy({
                ...req.body,
                isDeleted: false,
                isActive: true,
            });
            await newRoomOccupancy.save();

            res.status(200).json(newRoomOccupancy);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateRoomOccupancy: async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = addRoomOccupancySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid room occupancy id");
            }
            const roomOccupancy = await RoomOccupancy.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!roomOccupancy) {
                return sendErrorResponse(res, 404, "room occupancy not found");
            }

            res.status(200).json(roomOccupancy);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteRoomOccupancy: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid room occupancy id");
            }
            const roomOccupancy = await RoomOccupancy.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { isDeleted: true }
            );
            if (!roomOccupancy) {
                return sendErrorResponse(res, 404, "room occupancy not found");
            }

            res.status(200).json({ message: "room occupancy successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllRoomOccupancies: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false, isActive: true };
            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    { occupancyName: { $regex: searchQuery, $options: "i" } },
                    { shortName: { $regex: searchQuery, $options: "i" } },
                ];
            }

            const roomOccupancies = await RoomOccupancy.find(filters).lean();

            const totalRoomOccupancies = await RoomOccupancy.find(filters).count();

            res.status(200).json({
                totalRoomOccupancies,
                skip: Number(skip),
                limit: Number(limit),
                roomOccupancies,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleRoomOccupancy: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid room occupancy id");
            }
            const roomOccupancy = await RoomOccupancy.findOne({ _id: id, isDeleted: false }).lean();
            if (!roomOccupancy) {
                return sendErrorResponse(res, 404, "room occupancy not found");
            }

            res.status(200).json(roomOccupancy);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
