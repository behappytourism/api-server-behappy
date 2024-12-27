const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { Market } = require("../../../models/global");
const { marketSchema } = require("../../validations/global/market.schema");

module.exports = {
    addNewMarket: async (req, res) => {
        try {
            const { _, error } = marketSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const newMarket = new Market({
                ...req.body,
            });
            await newMarket.save();

            res.status(200).json(newMarket);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateMarket: async (req, res) => {
        try {
            const { id } = req.params;
            const { marketName } = req.body;

            const { _, error } = marketSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid market id");
            }
            const market = await Market.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { marketName },
                { new: true, runValidators: true }
            );

            res.status(200).json(market);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteMarket: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid market id");
            }
            const market = await Market.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { isDeleted: true }
            );
            if (!market) {
                return sendErrorResponse(res, 404, "market not found");
            }

            res.status(200).json({ message: "market successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllMarkets: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const markets = await Market.find({ isDeleted: false })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();
            if (!markets) {
                return sendErrorResponse(res, 400, "market not found");
            }

            const totalMarkets = await Market.find({ isDeleted: false }).count();

            res.status(200).json({
                totalMarkets,
                skip: Number(skip),
                limit: Number(limit),
                markets,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
