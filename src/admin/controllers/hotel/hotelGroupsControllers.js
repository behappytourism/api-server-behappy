const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { HotelGroup } = require("../../../models/hotel");
const { hotelGroupSchema } = require("../../validations/hotel/hotelGroup.schema");

module.exports = {
    addNewHotelGroup: async (req, res) => {
        try {
            const { groupCode } = req.body;

            const { _, error } = hotelGroupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const exHotelGroup = await HotelGroup.findOne({ groupCode: groupCode?.toUpperCase() });
            if (exHotelGroup) {
                return sendErrorResponse(res, 400, "group code already exists");
            }

            const newHotelGroup = new HotelGroup({
                ...req.body,
            });
            await newHotelGroup.save();

            res.status(200).send(newHotelGroup);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateHotelGroup: async (req, res) => {
        try {
            const { id } = req.params;
            const { groupCode } = req.body;

            const { _, error } = hotelGroupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel group id");
            }

            const exHotelGroup = await HotelGroup.findOne({
                groupCode: groupCode?.toUpperCase(),
                _id: { $ne: id },
            });
            if (exHotelGroup) {
                return sendErrorResponse(res, 400, "group code already exists");
            }

            const hotelGroup = await HotelGroup.findOneAndUpdate(
                { _id: id },
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!hotelGroup) {
                return sendErrorResponse(res, 404, "hotel group not found");
            }

            res.status(200).json(hotelGroup);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteHotelGroup: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel group id");
            }

            const hotelGroup = await HotelGroup.findByIdAndDelete(id);
            if (!hotelGroup) {
                return sendErrorResponse(res, 404, "hotel group not found");
            }

            res.status(200).json({ message: "hotel gruop successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllHotelGroups: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = {};
            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    { groupCode: { $regex: searchQuery, $options: "i" } },
                    { groupName: { $regex: searchQuery, $options: "i" } },
                ];
            }

            const hotelGroups = await HotelGroup.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalHotelGroups = await HotelGroup.find(filters).count();

            res.status(200).json({
                totalHotelGroups,
                skip: Number(skip),
                limit: Number(limit),
                hotelGroups,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllHotelGroupNames: async (req, res) => {
        try {
            const hotelGroups = await HotelGroup.find({})
                .select("groupName groupCode")
                .sort({ groupName: 1 })
                // .collation({ locale: "en", caseLevel: true });

            res.status(200).json(hotelGroups);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
