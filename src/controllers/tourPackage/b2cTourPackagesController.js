const { sendErrorResponse } = require("../../helpers");
const { TourPackage } = require("../../models/tourPackage");

module.exports = {
    searchTourPackage: async (req, res) => {
        try {
            const { skip = 0, limit = 10, search } = req.query;
            let filters1 = { isDeleted: false };

            if (search && search !== "") {
                filters1.packageName = { $regex: search, $options: "i" };
            }

            const tourPackages = await TourPackage.find({ isDeleted: false }).populate(
                "country destination"
            );

            let filteredTourPackages = tourPackages
                .filter((package) => {
                    const searchRegex = new RegExp(search, "i"); // 'i' flag for case-insensitive matching
                    return (
                        searchRegex.test(package?.packageName) ||
                        searchRegex.test(package?.country?.countryName) ||
                        searchRegex.test(package?.destination?.name)
                    );
                })
                .map((package) => {
                    return {
                        packageName: package.packageName,
                        slug: package.slug,
                        country: package?.country?.countryName,
                        destination: package?.destination?.name,
                    };
                });

            let totalPackages = filteredTourPackages.length;

            res.status(200).json({
                tourPackages: filteredTourPackages,
                totalPackages,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getAllTourPackages: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const tourPackages = await TourPackage.find({ isDeleted: false })
                .populate("packageThemes", "themeName")
                .populate("country", "countryName")
                .populate("destination", "name")
                .sort({ createdAt: -1 })
                .select(
                    "_id packageType thumbnail packageName slug noOfDays packageThemes totalPrice"
                )
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
            const { slug } = req.params;

            const tourPackage = await TourPackage.findOne({ slug, isDeleted: false })
                .populate({
                    path: "itineraries.itineraryItems.activity",
                    populate: {
                        path: "attraction",
                        select: { images: 1, thumbnail: { $arrayElemAt: ["$images", 0] } },
                    },
                    select: { name: 1, attraction: 1 },
                })
                .populate({
                    path: "hotels.hotelOptions.hotel",
                    select: { hotelName: 1, image: { $arrayElemAt: ["$images", 0] }, address: 1 },
                })
                .populate("country", "countryName")
                .populate("destination", "name")
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
