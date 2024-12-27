const B2BHotelProvider = require("../../../b2b/models/hotel/b2bHotelProviders.model");
const { sendErrorResponse } = require("../../../helpers");
const { hoteProvidersSchema } = require("../../validations/hotel/hotelProviders.shema");

module.exports = {
    addHotelProvider: async (req, res) => {
        try {
            const { name, isActive, configurations } = req.body;

            const { _, error } = hoteProvidersSchema.validate(req.body);

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const newHotelProvider = new B2BHotelProvider({
                name,
                isActive,
                configurations,
            });
            await newHotelProvider.save();

            res.status(200).json(newHotelProvider);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    getAllHotelProviders: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.name = { $regex: searchQuery, $options: "i" };
            }

            const hotelProviders = await B2BHotelProvider.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalHotelProviders = await B2BHotelProvider.find(filters).count();

            res.status(200).json({
                hotelProviders,
                totalHotelProviders,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    updateHotelProvider: async (req, res) => {
        try {
            const { id } = req.params;

            const { name, isActive, configurations } = req.body;

            const { _, error } = hoteProvidersSchema.validate(req.body);

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const updatedHotelProvider = await B2BHotelProvider.findOneAndUpdate(
                { _id: id },
                {
                    name,
                    isActive,
                    configurations,
                },
                { runValidators: true, new: true }
            ).lean();

            res.status(200).json(updatedHotelProvider);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteHotelProvider: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel provider id");
            }

            const hotelProvider = await B2BHotelProvider.findOneAndDelete({ _id: id });
            if (!hotelProvider) {
                return sendErrorResponse(res, 404, "hotel provider not found");
            }

            res.status(200).json({ message: "hotel provider successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
