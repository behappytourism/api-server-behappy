const { isValidObjectId, Types } = require("mongoose");

const { B2BHotelResellerSettings } = require("../../../b2b/models/hotel");
const { sendErrorResponse } = require("../../../helpers");
const { Reseller } = require("../../../b2b/models");
const {
    b2bHotelResellerSettingsSchema,
} = require("../../validations/hotel/b2bHotelResellerSettings.schema");

module.exports = {
    upsertB2bHotelResellerSettings: async (req, res) => {
        try {
            const { resellerId, availableHotels, availableAreas, availableCities } = req.body;

            const { error } = b2bHotelResellerSettingsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error?.details[0]?.message);
            }

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }
            const reseller = await Reseller.findOne({ _id: resellerId, isDeleted: false }).lean();
            if (!reseller) {
                return sendErrorResponse(res, 404, "reseller not found");
            }
            if (reseller?.role !== "reseller") {
                return sendErrorResponse(res, 400, "this option is not available for sub-agents");
            }

            const newB2bHotelResellerSettings = await B2BHotelResellerSettings.findOneAndUpdate(
                { resellerId },
                {
                    resellerId,
                    availableHotels: availableHotels?.map((item) => Types.ObjectId(item)) || [],
                    availableAreas: availableAreas?.map((item) => Types.ObjectId(item)) || [],
                    availableCities: availableCities?.map((item) => Types.ObjectId(item)) || [],
                },
                { runValidators: true, new: true, upsert: true }
            );

            res.status(200).json(newB2bHotelResellerSettings);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleResellerHotelSettings: async (req, res) => {
        try {
            const { resellerId } = req.params;

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }

            const b2bHotelResellerSettings = await B2BHotelResellerSettings.findOne({
                resellerId,
            })
                .populate("availableHotels", "hotelName address")
                .populate("availableAreas", "areaName")
                .populate("availableCities", "cityName")
                .lean();

            res.status(200).json(b2bHotelResellerSettings || {});
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    clearB2bHotelResellerSettings: async (req, res) => {
        try {
            const { resellerId } = req.params;

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }
            const reseller = await Reseller.findOne({ _id: resellerId, isDeleted: false }).lean();
            if (!reseller) {
                return sendErrorResponse(res, 404, "reseller not found");
            }
            if (reseller?.role !== "reseller") {
                return sendErrorResponse(res, 400, "this option is not available for sub-agents");
            }

            await B2BHotelResellerSettings.findOneAndUpdate(
                {
                    resellerId,
                },
                { availableHotels: [], availableAreas: [], availableCities: [] }
            );

            res.status(200).json({ availableHotels: [], availableAreas: [], availableCities: [] });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
