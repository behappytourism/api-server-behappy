const { isValidObjectId } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { HotelBannerAd, Hotel } = require("../../../models/hotel");
const { admHotelBannerAdSchema } = require("../../validations/hotel/admHotelBannerAd.schema");

module.exports = {
    addNewHotelBannerAd: async (req, res) => {
        try {
            const { hotelId } = req.body;

            const { error } = admHotelBannerAdSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotel = await Hotel.findOne({ _id: hotelId, isDeleted: false })
                .select("_id hotelName country address")
                .lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            if (!req.file?.path) {
                return sendErrorResponse(res, 400, "banner image is required");
            }
            let bannerImage;
            if (req.file?.path) {
                bannerImage = "/" + req.file.path.replace(/\\/g, "/");
            }

            const hotelBannerAd = await HotelBannerAd.create({
                ...req.body,
                bannerImage,
            });

            res.status(200).json({ ...hotelBannerAd, hotel });
        } catch (err) {
            sendErrorResponse(req, 500, err);
        }
    },

    updateHotelBannerAd: async (req, res) => {
        try {
            const { id } = req.params;
            const { hotelId } = req.body;

            const { error } = admHotelBannerAdSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel banner ad id");
            }
            const hotelBannerAd = await HotelBannerAd.findById(id).lean();
            if (!hotelBannerAd) {
                return sendErrorResponse(res, 404, "hotel banner ad not found");
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotel = await Hotel.findOne({ _id: hotelId, isDeleted: false })
                .select("_id hotelName country address")
                .lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            let bannerImage;
            if (req.file?.path) {
                bannerImage = "/" + req.file.path.replace(/\\/g, "/");
            }

            const updatedHotelBannerAd = await HotelBannerAd.findByIdAndUpdate(
                id,
                {
                    ...req.body,
                    bannerImage: bannerImage || undefined,
                },
                { runValidators: true, new: true }
            ).lean();

            res.status(200).json({
                ...updatedHotelBannerAd,
                hotel,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteHotelBannerAd: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel banner ad id");
            }
            const hotelBannerAd = await HotelBannerAd.findByIdAndDelete(id);
            if (!hotelBannerAd) {
                return sendErrorResponse(res, 404, "hotel banner ad not found");
            }

            res.status(200).json({ message: "hotel banner ad successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllHotelBannerAds: async (req, res) => {
        try {
            const { hotelName, skip = 0, limit = 10 } = req.query;

            const filters = {};
            if (hotelName && hotelName !== "") {
                filters["hotel.hotelName"] = {
                    $regex: hotelName,
                    $options: "i",
                };
            }

            const hotelBannerAds = await HotelBannerAd.aggregate([
                { $match: {} },
                {
                    $lookup: {
                        from: "hotels",
                        localField: "hotelId",
                        foreignField: "_id",
                        as: "hotel",
                        pipeline: [{ $project: { hotelName: 1, address: 1, country: 1 } }],
                    },
                },
                {
                    $set: {
                        hotel: { $arrayElemAt: ["$hotel", 0] },
                    },
                },
                { $match: filters },
                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: null,
                        totalBannerAds: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalBannerAds: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                skip: Number(skip),
                limit: Number(limit),
                hotelBannerAds: hotelBannerAds[0],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
