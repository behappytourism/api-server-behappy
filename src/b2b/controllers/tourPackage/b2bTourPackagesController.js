const { isValidObjectId } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { TourPackage } = require("../../../models/tourPackage");

module.exports = {
    getAllTourPackages: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const tourPackages = await TourPackage.find({ isDeleted: false })
                .populate("packageThemes", "themeName")
                .sort({ createdAt: -1 })
                .select("_id packageType thumbnail packageName noOfDays packageThemes")
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalTourPackages = await TourPackage.find({ isDeleted: false }).count();

            res.status(200).json({
                totalTourPackages,
                skip: Number(skip),
                limit: Number(limit),
                tourPackages,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleTourPackage: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid tour package id");
            }
            const tourPackage = await TourPackage.findOne({ _id: id, isDeleted: false })
                .populate({
                    path: "itineraries.itineraryItems.activity",
                    populate: {
                        path: "attraction",
                        select: { image: { $arrayElemAt: ["$images", 0] } },
                    },
                    select: { name: 1, attraction: 1 },
                })
                .populate({
                    path: "hotels.hotelOptions.hotel",
                    select: { hotelName: 1, image: { $arrayElemAt: ["$images", 0] }, address: 1 },
                })
                .populate({ path: "hotels.hotelOptions.roomType", select: { roomName: 1 } })
                .populate("packageThemes", "themeName")
                .lean();
            if (!tourPackage) {
                return sendErrorResponse(res, 400, "tour package not found");
            }

            res.status(200).json(tourPackage);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
