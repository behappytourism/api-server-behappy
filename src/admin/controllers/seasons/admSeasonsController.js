const { Reseller } = require("../../../b2b/models");
const { sendErrorResponse } = require("../../../helpers");
const { Season } = require("../../../models");
const { isValidObjectId } = require("mongoose");

module.exports = {
    addSeasons: async (req, res) => {
        try {
            const { fromDate, toDate, name } = req.body;

            const newSeason = new Season({
                fromDate,
                toDate,
                name,
            });

            await newSeason.save();

            res.status(200).json({
                message: "New Season successfully created",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateSeasons: async (req, res) => {
        try {
            const { id } = req.params;
            const { fromDate, toDate, name } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid season id");
            }

            const season = await Season.findOneAndUpdate(
                {
                    _id: id,
                },
                {
                    $set: {
                        fromDate,
                        toDate,
                        name,
                    },
                }
            );

            if (!season) {
                return sendErrorResponse(res, 404, "season not found");
            }

            res.status(200).json({
                message: "season updated successfully ",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllSeasons: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const seasons = await Season.find({ isDeleted: false })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();
            if (!seasons) {
                return sendErrorResponse(res, 404, "seasons not found");
            }

            const totalSeasons = await Season.findOne({ isDeleted: false }).count();

            res.status(200).json({
                seasons,
                totalSeasons,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleSeason: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid season id");
            }

            const season = await Season.findOne({ isDeleted: false });

            if (!season) {
                return sendErrorResponse(res, 400, "season not found");
            }

            res.status(200).json(season);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteSeason: async (req, res) => {
        try {
            const { id } = req.params;

            const season = await Season.findOneAndUpdate(
                {
                    _id: id,
                },
                {
                    $set: {
                        isDeleted: true,
                    },
                }
            );

            if (!season) {
                return sendErrorResponse(res, 404, "season not found");
            }

            res.status(200).json({
                message: "season deleted successfully ",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
