const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { HotelBoardType, Hotel } = require("../../../models/hotel");
const { boardTypeSchema } = require("../../validations/hotel/boardType.schema");

module.exports = {
    addHotelBoardType: async (req, res) => {
        try {
            const { boardShortName, subNames } = req.body;

            const { isForSubNames, boardId } = req.query;

            const { _, error } = boardTypeSchema.validate(req.body, {
                context: {
                    isForSubNames,
                },
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let BoardType;
            if (isForSubNames === "true") {
                if (boardId) {
                    const updatedDoc = await HotelBoardType.findOneAndUpdate(
                        {
                            _id: boardId,
                        },
                        { $set: { subNames } },
                        {
                            returnOriginal: false,
                        }
                    );

                    BoardType = updatedDoc;
                }
            } else {
                const exBoardType = await HotelBoardType.findOne({
                    boardShortName: boardShortName?.toUpperCase(),
                });
                if (exBoardType) {
                    return sendErrorResponse(
                        res,
                        400,
                        "a board type already exists with this shortName"
                    );
                }

                const newBoardType = new HotelBoardType({
                    ...req.body,
                });
                await newBoardType.save();

                BoardType = newBoardType;
            }

            res.status(200).json(BoardType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getHotelBoardTypes: async (req, res) => {
        try {
            const { hotelId } = req.params;

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
                isPublished: true,
                isActive: true,
            });
            if (!hotel) {
                return sendErrorResponse(res, 404, "invalid hotel id");
            }

            const boardTypes = await HotelBoardType.find({ _id: hotel.boardTypes });

            res.status(200).json(boardTypes);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllBoardTypes: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = {};
            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    { boardShortName: { $regex: searchQuery, $options: "i" } },
                    { boardName: { $regex: searchQuery, $options: "i" } },
                ];
            }

            const boardTypes = await HotelBoardType.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalBoardTypes = await HotelBoardType.find(filters).count();

            res.status(200).json({
                boardTypes,
                totalBoardTypes,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleBoardType: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid board type id");
            }

            const boardType = await HotelBoardType.findById(id);
            if (!boardType) {
                return sendErrorResponse(res, 404, "board type not found");
            }

            res.status(200).json(boardType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteBoardType: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid board type id");
            }

            const boardType = await HotelBoardType.findByIdAndDelete(id);
            if (!boardType) {
                return sendErrorResponse(res, 404, "borad type not found");
            }

            res.status(200).json({
                message: "borad type successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateHotelBoardType: async (req, res) => {
        try {
            const { id } = req.params;
            const { boardShortName } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid board type id");
            }

            const { _, error } = boardTypeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const exBoardType = await HotelBoardType.findOne({
                boardShortName: boardShortName?.toUpperCase(),
                _id: { $ne: id },
            });
            if (exBoardType) {
                return sendErrorResponse(
                    res,
                    400,
                    "a board type already exists with this shortName"
                );
            }

            const hotelBoardType = await HotelBoardType.findOneAndUpdate(
                {
                    _id: id,
                },
                { ...req.body },
                { runValidators: true, new: true }
            );

            if (!hotelBoardType) {
                return sendErrorResponse(res, 404, "hotel board type not found");
            }

            res.status(200).json(hotelBoardType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
