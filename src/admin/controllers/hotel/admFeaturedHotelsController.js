const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { admFeaturedHotelSchema } = require("../../validations/hotel/admFeaturedHotel.schema");
const { Hotel, FeaturedHotel } = require("../../../models/hotel");
const { clearCache } = require("../../../config/cache");

module.exports = {
    addFeaturedHotel: async (req, res) => {
        try {
            const { hotelId } = req.body;

            const { error } = admFeaturedHotelSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotel = await Hotel.findOne({ _id: hotelId, isDeleted: false })
                .select("hotelName images")
                .lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const exFeaturedHotel = await FeaturedHotel.findOne({ hotelId }).lean();
            if (exFeaturedHotel) {
                return sendErrorResponse(res, 400, "You already added this hotel as featured");
            }

            const newFeaturedHotel = await FeaturedHotel.create({
                ...req.body,
                hotelName: hotel?.hotelName,
                thumbnail: {
                    path: hotel.images[0]?.path,
                    isRelative: hotel.images[0]?.isRelative,
                },
            });

            clearCache("featuredHotelsList");

            res.status(200).json({
                ...newFeaturedHotel,
                hotelId: {
                    _id: hotelId,
                    hotelName: newFeaturedHotel?.hotelName,
                    address: hotel?.address,
                    country: hotel?.country,
                },
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateFeaturedHotel: async (req, res) => {
        try {
            const { id } = req.params;
            const { hotelId } = req.body;

            const { error } = admFeaturedHotelSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid featured id");
            }
            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const featuredHotel = await FeaturedHotel.findOne({ _id: id, hotelId }).lean();
            if (!featuredHotel) {
                return sendErrorResponse(res, 404, "featureHotel not found");
            }

            const hotel = await Hotel.findOne({ _id: hotelId, isDeleted: false })
                .select("hotelName images country")
                .lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const updatedFeaturedHotel = await FeaturedHotel.findByIdAndUpdate(
                id,
                {
                    ...req.body,
                    hotelName: hotel?.hotelName,
                    thumbnail: {
                        path: hotel.images[0]?.path,
                        isRelative: hotel.images[0]?.isRelative,
                    },
                },
                { runValidators: true, new: true }
            ).lean();

            clearCache("featuredHotelsList");

            res.status(200).json({
                ...updatedFeaturedHotel,
                hotelId: {
                    _id: hotelId,
                    hotelName: updatedFeaturedHotel?.hotelName,
                    address: hotel?.address,
                    country: hotel?.country,
                },
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteFeaturedHotel: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid featured id");
            }
            const featuredHotel = await FeaturedHotel.findByIdAndDelete(id);
            if (!featuredHotel) {
                return sendErrorResponse(res, 404, "featured hotel not found");
            }

            clearCache("featuredHotelsList");

            res.status(200).json({ message: "featured hotel successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllFeaturedHotels: async (req, res) => {
        try {
            const { hotelName, skip = 0, limit = 10 } = req.query;

            const filters = {};
            if (hotelName && hotelName !== "") {
                filters.hotelName = {
                    $regex: hotelName,
                    $options: "i",
                };
            }

            const featuredHotels = await FeaturedHotel.find(filters)
                .populate("hotelId", "hotelName address country")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalFeaturedHotels = await FeaturedHotel.find(filters).count();

            res.status(200).json({
                totalFeaturedHotels,
                skip: Number(skip),
                limit: Number(limit),
                featuredHotels,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
