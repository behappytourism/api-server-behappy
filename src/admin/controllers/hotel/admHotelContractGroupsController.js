const { isValidObjectId, Types } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { HotelContractGroup, Hotel } = require("../../../models/hotel");
const { hotelContractGroupSchema } = require("../../validations/hotel/hotelContractGroup.schema");

module.exports = {
    addNewHotelContractGroup: async (req, res) => {
        try {
            const { hotel } = req.body;

            const { _, error } = hotelContractGroupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(hotel)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotelDetails = await Hotel.findOne({
                _id: hotel,
                isDeleted: false,
            });
            if (!hotelDetails) {
                return sendErrorResponse(res, 404, "Hotel not found");
            }

            const newHotelContractGroup = new HotelContractGroup({
                ...req.body,
            });
            await newHotelContractGroup.save();

            res.status(200).json(newHotelContractGroup);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateHotelContractGroup: async (req, res) => {
        try {
            const { id } = req.params;
            const { hotel } = req.body;

            const { _, error } = hotelContractGroupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(hotel)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotelDetails = await Hotel.findOne({
                _id: hotel,
                isDeleted: false,
            });
            if (!hotelDetails) {
                return sendErrorResponse(res, 404, "Hotel not found");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel contract group id");
            }
            const hotelContractGroup = await HotelContractGroup.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    ...req.body,
                },
                { new: true, runValidators: true }
            );

            res.status(200).json(hotelContractGroup);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteHotelContractGroup: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel contract group id");
            }
            const hotelContractGroup = await HotelContractGroup.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { isDeleted: true }
            );
            if (!hotelContractGroup) {
                return sendErrorResponse(res, 404, "Hotel contract group not found");
            }

            // await HotelPromotion.updateMany(
            //     { contractGroups: id },
            //     { $pull: { contractGroups: id } }
            // );

            // await HotelContract.updateMany(
            //     { contractGroup: id },
            //     { $set: { contractGroup: null } }
            // );

            res.status(200).json({
                message: "hotel contract group successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSinglHotelContractGroups: async (req, res) => {
        try {
            const { hotelId } = req.params;
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { hotel: Types.ObjectId(hotelId), isDeleted: false };
            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    { contractCode: { $regex: searchQuery, $options: "i" } },
                    { contractName: { $regex: searchQuery, $options: "i" } },
                ];
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotelDetails = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
            }).lean();
            if (!hotelDetails) {
                return sendErrorResponse(res, 404, "Hotel not found");
            }

            const hotelContractGroups = await HotelContractGroup.aggregate([
                { $match: filters },
                {
                    $lookup: {
                        from: "hotelcontracts",
                        localField: "_id",
                        foreignField: "contractGroup",
                        as: "contracts",
                        pipeline: [
                            {
                                $match: {
                                    isDeleted: false,
                                },
                            },
                        ],
                    },
                },
                {
                    $addFields: {
                        totalContracts: {
                            $size: "$contracts",
                        },
                    },
                },
                {
                    $sort: { createdAt: -1 },
                },
                {
                    $skip: Number(limit) * Number(skip),
                },
                {
                    $limit: Number(limit),
                },
            ]);

            const totalContractGroups = await HotelContractGroup.find(filters).count();

            res.status(200).json({
                skip: Number(skip),
                limit: Number(limit),
                totalContractGroups,
                hotelContractGroups,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelAllContractGroupNames: async (req, res) => {
        try {
            const { hotelId } = req.params;

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotelDetails = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
            }).lean();
            if (!hotelDetails) {
                return sendErrorResponse(res, 404, "Hotel not found");
            }

            const hotelGroups = await HotelContractGroup.find({ hotel: hotelId, isDeleted: false })
                .sort({ createdAt: -1 })
                .select("contractName contractCode")
                .lean();

            res.status(200).json(hotelGroups);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
