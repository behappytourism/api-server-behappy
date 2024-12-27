const { isValidObjectId } = require("mongoose");
const { HotelChain, HotelGroup } = require("../../../models/hotel");
const { hotelChainSchema } = require("../../validations/hotel/hotelChain.schema");
const { sendErrorResponse } = require("../../../helpers");

module.exports = {
    addNewHotelChain: async (req, res) => {
        try {
            const { chainCode, chainName, hotelGroup } = req.body;

            const { _, error } = hotelChainSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const exChain = await HotelChain.findOne({ chainCode: chainCode?.toUpperCase() });
            if (exChain) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry, already a chain exists with this chainCode"
                );
            }

            let hotelGroupDetail;
            if (hotelGroup) {
                if (!isValidObjectId(hotelGroup)) {
                    return sendErrorResponse(res, 400, "invalid hotel group id");
                }
                hotelGroupDetail = await HotelGroup.findById(hotelGroup).lean();
                if (!hotelGroupDetail) {
                    return sendErrorResponse(res, 404, "hotel group not found");
                }
            }

            const newChain = new HotelChain({
                chainCode,
                chainName,
                hotelGroup: hotelGroup ? hotelGroup : undefined,
            });
            await newChain.save();

            const temp = JSON.parse(JSON.stringify(newChain));
            temp.hotelGroup = hotelGroupDetail;

            res.status(200).json(temp);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateHotelChain: async (req, res) => {
        try {
            const { id } = req.params;

            const { chainCode, chainName, hotelGroup } = req.body;

            const { _, error } = hotelChainSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel chain id");
            }

            const exChain = await HotelChain.findOne({
                chainCode: chainCode?.toUpperCase(),
                _id: { $ne: id },
            });
            if (exChain) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry, already a chain exists with this chainCode"
                );
            }

            let hotelGroupDetail;
            if (hotelGroup) {
                if (!isValidObjectId(hotelGroup)) {
                    return sendErrorResponse(res, 400, "invalid hotel group id");
                }
                hotelGroupDetail = await HotelGroup.findById(hotelGroup).lean();
                if (!hotelGroupDetail) {
                    return sendErrorResponse(res, 404, "hotel group not found");
                }
            }

            const hotelChain = await HotelChain.findOneAndUpdate(
                { _id: id },
                { chainCode, chainName, hotelGroup: hotelGroup ? hotelGroup : undefined },
                { runValidators: true, new: true }
            ).lean();
            if (!hotelChain) {
                return sendErrorResponse(res, 404, "hotel chian not found");
            }

            const temp = hotelChain;
            temp.hotelGroup = hotelGroupDetail;

            res.status(200).json(temp);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteHotelChain: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel chain id");
            }

            const hotelChain = await HotelChain.findOneAndDelete({ _id: id });
            if (!hotelChain) {
                return sendErrorResponse(res, 404, "hotel chain not found");
            }

            res.status(200).json({ message: "hotel chain successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllHotelChains: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = {};
            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    { chainCode: { $regex: searchQuery, $options: "i" } },
                    { chainName: { $regex: searchQuery, $options: "i" } },
                ];
            }

            const hotelChains = await HotelChain.find(filters)
                .populate("hotelGroup")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalHotelChains = await HotelChain.find(filters).count();

            res.status(200).json({
                skip: Number(skip),
                limit: Number(limit),
                totalHotelChains,
                hotelChains,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
