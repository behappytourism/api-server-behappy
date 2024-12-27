const { isValidObjectId, Types } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { HotelAddOn, Hotel } = require("../../../models/hotel");
const { hotelAddonsSchema } = require("../../validations/hotel/hotelAddons.schema");

module.exports = {
    addNewAddOn: async (req, res) => {
        try {
            const { hotel, applyOn, adultPrice, childPrice, roomPrice } = req.body;

            const { _, error } = hotelAddonsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(hotel)) {
                return sendErrorResponse(res, 400, "invalid hot id");
            }

            const hotelDetail = await Hotel.findOne({ hotel, isDeleted: false, isPublished: true });
            if (!hotelDetail) {
                return sendErrorResponse(res, 404, "hotel detail not found");
            }

            const newAddOn = new HotelAddOn({
                ...req.body,
                adultPrice: applyOn === "pax" ? adultPrice : null,
                childPrice: applyOn === "pax" ? childPrice : null,
                roomPrice: applyOn === "room" ? roomPrice : null,
            });
            await newAddOn.save();

            res.status(200).json(newAddOn);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAddOn: async (req, res) => {
        try {
            const { id } = req.params;
            const { hotel, applyOn, adultPrice, childPrice, roomPrice } = req.body;

            const { _, error } = hotelAddonsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            if (!isValidObjectId(hotel)) {
                return sendErrorResponse(res, 400, "invalid hot id");
            }

            const hotelDetail = await Hotel.findOne({ hotel, isDeleted: false, isPublished: true });
            if (!hotelDetail) {
                return sendErrorResponse(res, 404, "hotel detail not found");
            }

            const existingAddOn = await HotelAddOn.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                {
                    ...req.body,
                    adultPrice: applyOn === "pax" ? adultPrice : null,
                    childPrice: applyOn === "pax" ? childPrice : null,
                    roomPrice: applyOn === "room" ? roomPrice : null,
                },
                { new: true, runValidators: true }
            );
            if (!existingAddOn) {
                return sendErrorResponse(res, 404, "addon not found");
            }

            res.status(200).json(existingAddOn);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteAddOn: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const addOn = await HotelAddOn.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { isDeleted: true }
            );
            if (!addOn) {
                return sendErrorResponse(res, 404, "add on not found");
            }

            res.status(200).json({ message: "add on successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelAllAddOns: async (req, res) => {
        try {
            const { hotelId } = req.params;
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { hotel: Types.ObjectId(hotelId), isDeleted: false };
            if (searchQuery && searchQuery !== "") {
                filters.addOnName = { $regex: searchQuery, $options: "i" };
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
                isPublished: true,
            });
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const addOns = await HotelAddOn.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalAddOns = await HotelAddOn.find(filters).count();

            res.status(200).json({ totalAddOns, skip: Number(skip), limit: Number(limit), addOns });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleAddOns: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid  addOns id");
            }

            const addOns = await HotelAddOn.findById(id);

            if (!addOns) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            res.status(200).json(addOns);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
