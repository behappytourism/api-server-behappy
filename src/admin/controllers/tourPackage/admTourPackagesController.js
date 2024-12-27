const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { AttractionActivity, Country, Destination } = require("../../../models");
const { City } = require("../../../models/global");
const { Hotel, RoomType } = require("../../../models/hotel");
const { TourPackage, TourPackageTheme } = require("../../../models/tourPackage");
const { admTourPackageSchema } = require("../../validations/tourPackage/admTourPackage.schema");

module.exports = {
    addNewTourPackage: async (req, res) => {
        try {
            const {
                packageThemes,
                packageType,
                itineraries,
                hotels,
                isAirportTransfer,
                airportTransferPrice,
                isInterHotelTransfer,
                interHotelPrice,
                availableDates,
                excludedDates,
                country,
                destination,
                oldImages,
            } = req.body;

            const parsedHotels = hotels ? JSON.parse(hotels) : [];
            const parsedItineraries = itineraries ? JSON.parse(itineraries) : [];
            const parsedAvailableDates = availableDates ? JSON.parse(availableDates) : [];
            const parsedExcludedDates = excludedDates ? JSON.parse(excludedDates) : [];
            const parsedPackageThemes = packageThemes ? JSON.parse(packageThemes) : [];

            const { error } = admTourPackageSchema.validate({
                ...req.body,
                hotels: parsedHotels,
                itineraries: parsedItineraries,
                availableDates: parsedAvailableDates,
                excludedDates: parsedExcludedDates,
                packageThemes: parsedPackageThemes,
                oldImages: oldImages ? JSON.parse(oldImages) : [],
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({ _id: country, isDeleted: false }).lean();
            if (!countryDetail) {
                return sendErrorResponse(res, 400, "country not found");
            }

            if (!isValidObjectId(destination)) {
                return sendErrorResponse(res, 400, "invalid destination id");
            }
            const destDetail = await Destination.findOne({
                _id: destination,
                isDeleted: false,
            }).lean();
            if (!destDetail) {
                return sendErrorResponse(res, 400, "destination not found");
            }

            // let thumbnailImg;
            // if (req.file?.path) {
            //     thumbnailImg = "/" + req.file.path.replace(/\\/g, "/");
            // }

            let thumbnailImg = [];
            let image = req.files["thumbnailImg"];
            if (!image || image?.length < 1) {
                return sendErrorResponse(res, 400, "minimum 1 image is required");
            } else {
                for (let i = 0; i < image?.length; i++) {
                    const img = "/" + image[i]?.path?.replace(/\\/g, "/");
                    thumbnailImg.push(img);
                }
            }

            // Validating selected package themes
            for (let theme of parsedPackageThemes) {
                if (!isValidObjectId(theme)) {
                    return sendErrorResponse(res, 400, "invalid package theme id");
                }
                const packageTheme = await TourPackageTheme.findById(theme).lean();
                if (!packageTheme) {
                    return sendErrorResponse(res, 400, "package theme not found");
                }
            }

            // this total price variable for saving calculated total price
            // calculate added hotels, itineraries, transfer and markup values
            let totalPrice = 0;

            // validating selected hotels
            // checking selected country, city, hotels, roomTypes and board types are valid or not.
            for (let hotelItem of parsedHotels) {
                if (!isValidObjectId(hotelItem?.country)) {
                    return sendErrorResponse(res, 400, "invalid country id in hotels section");
                }
                const country = await Country.findOne({
                    _id: hotelItem.country,
                    isDeleted: false,
                }).lean();
                if (!country) {
                    return sendErrorResponse(res, 400, "country not found in hotel option");
                }

                if (!isValidObjectId(hotelItem?.city)) {
                    return sendErrorResponse(res, 400, "invalid city id in hotels section");
                }
                const city = await City.findOne({
                    _id: hotelItem.city,
                    isDeleted: false,
                }).lean();
                if (!city) {
                    return sendErrorResponse(res, 400, "city not found in hotel section");
                }

                for (let hotelOption of hotelItem?.hotelOptions) {
                    if (!isValidObjectId(hotelOption?.hotelId)) {
                        return sendErrorResponse(res, 400, "invalid hotel id");
                    }
                    const hotel = await Hotel.findOne({
                        _id: hotelOption.hotelId,
                        isDeleted: false,
                    })
                        .select("_id")
                        .lean();
                    if (!hotel) {
                        return sendErrorResponse(res, 400, "hotel not found");
                    }

                    if (!isValidObjectId(hotelOption?.roomTypeId)) {
                        return sendErrorResponse(res, 400, "invalid room type id");
                    }
                    const roomType = await RoomType.findOne({
                        _id: hotelOption?.roomTypeId,
                        isDeleted: false,
                    })
                        .select("_id")
                        .lean();
                    if (!roomType) {
                        return sendErrorResponse(res, 400, "room type not found");
                    }
                }

                // If package type is static then hotel price should be for each city
                // Otherwise hotel price should be for each hotel. So we will take lowest hotel price
                if (packageType === "static") {
                    if (hotelItem?.price && !isNaN(hotelItem?.price)) {
                        totalPrice += Number(hotelItem?.price);
                    } else {
                        return sendErrorResponse(res, 400, "add hotel price");
                    }
                } else {
                    let sortedHotelOptions = hotelItem?.hotelOptions?.sort((a, b) => {
                        return a?.price - b?.price;
                    });
                    if (sortedHotelOptions[0]?.price && !isNaN(sortedHotelOptions[0]?.price)) {
                        totalPrice += Number(sortedHotelOptions[0]?.price);
                    } else {
                        return sendErrorResponse(
                            res,
                            400,
                            "add hotel price for each selected hotels"
                        );
                    }
                }
            }

            // Validating Itineraries. Each Activities price is coming from frontend.
            // And this price is transfer included price.
            for (let itinerary of parsedItineraries) {
                for (let itineraryItem of itinerary?.itineraryItems) {
                    if (
                        !isValidObjectId(itineraryItem?.attractionId) ||
                        !isValidObjectId(itineraryItem?.activityId)
                    ) {
                        return sendErrorResponse(res, 400, "invalid attraction or activity id");
                    }
                    const activity = await AttractionActivity.findOne({
                        _id: itineraryItem?.activityId,
                        attraction: itineraryItem?.attractionId,
                        isDeleted: false,
                    })
                        .select("_id")
                        .lean();
                    if (!activity) {
                        return sendErrorResponse(res, 400, "activity not found");
                    }

                    totalPrice += Number(itineraryItem?.price);
                }
            }

            // adding airport to hotel or vice versa transfer price to total price only if isAirportTransfer is true
            // also adding hotel to hotel transfer price to total price only if isInterHotelTransfer is true
            if (isAirportTransfer === "true") {
                totalPrice += Number(airportTransferPrice);
            }
            if (isInterHotelTransfer === "true") {
                totalPrice += Number(interHotelPrice);
            }

            // Saving and creating new tour package document.
            const newTourPackage = new TourPackage({
                ...req.body,
                hotels: parsedHotels,
                itineraries: parsedItineraries,
                availableDates: parsedAvailableDates,
                excludedDates: parsedExcludedDates,
                packageThemes: parsedPackageThemes,
                totalPrice,
                thumbnail: thumbnailImg,
            });
            await newTourPackage.save();

            res.status(200).json(newTourPackage);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    updateTourPackage: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                packageThemes,
                packageType,
                itineraries,
                hotels,
                isAirportTransfer,
                airportTransferPrice,
                isInterHotelTransfer,
                interHotelPrice,
                availableDates,
                excludedDates,
                country,
                destination,
                oldImages,
            } = req.body;

            const parsedHotels = hotels ? JSON.parse(hotels) : [];
            const parsedItineraries = itineraries ? JSON.parse(itineraries) : [];
            const parsedAvailableDates = availableDates ? JSON.parse(availableDates) : [];
            const parsedExcludedDates = excludedDates ? JSON.parse(excludedDates) : [];
            const parsedPackageThemes = packageThemes ? JSON.parse(packageThemes) : [];

            const { error } = admTourPackageSchema.validate({
                ...req.body,
                hotels: parsedHotels,
                itineraries: parsedItineraries,
                availableDates: parsedAvailableDates,
                excludedDates: parsedExcludedDates,
                packageThemes: parsedPackageThemes,
                oldImages: oldImages ? JSON.parse(oldImages) : [],
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({ _id: country, isDeleted: false }).lean();
            if (!countryDetail) {
                return sendErrorResponse(res, 400, "country not found");
            }

            if (!isValidObjectId(destination)) {
                return sendErrorResponse(res, 400, "invalid destination id");
            }
            const destDetail = await Destination.findOne({
                _id: destination,
                isDeleted: false,
            }).lean();
            if (!destDetail) {
                return sendErrorResponse(res, 400, "destination not found");
            }

            // let thumbnailImg;
            // if (req.file?.path) {
            //     thumbnailImg = "/" + req.file.path.replace(/\\/g, "/");
            // }

            let parsedOldImages = [];
            if (oldImages) {
                parsedOldImages = JSON.parse(oldImages);
            }

            let thumbnailImg = [...parsedOldImages];

            if (req.files["thumbnailImg"]) {
                let image = req.files["thumbnailImg"];
                for (let i = 0; i < image.length; i++) {
                    const img = "/" + image[i]?.path?.replace(/\\/g, "/");
                    thumbnailImg.push(img);
                }
            }

            // Validating selected package themes
            for (let theme of parsedPackageThemes) {
                if (!isValidObjectId(theme)) {
                    return sendErrorResponse(res, 400, "invalid package theme id");
                }
                const packageTheme = await TourPackageTheme.findById(theme).lean();
                if (!packageTheme) {
                    return sendErrorResponse(res, 400, "package theme not found");
                }
            }

            // this total price variable for saving calculated total price
            // calculate added hotels, itineraries, transfer and markup values
            let totalPrice = 0;

            // validating selected hotels
            // checking selected country, city, hotels, roomTypes and board types are valid or not.
            for (let hotelItem of parsedHotels) {
                if (!isValidObjectId(hotelItem?.country)) {
                    return sendErrorResponse(res, 400, "invalid country id in hotels section");
                }
                const country = await Country.findOne({
                    _id: hotelItem.country,
                    isDeleted: false,
                }).lean();
                if (!country) {
                    return sendErrorResponse(res, 400, "country not found in hotel option");
                }

                if (!isValidObjectId(hotelItem?.city)) {
                    return sendErrorResponse(res, 400, "invalid city id in hotels section");
                }
                const city = await City.findOne({
                    _id: hotelItem.city,
                    isDeleted: false,
                }).lean();
                if (!city) {
                    return sendErrorResponse(res, 400, "city not found in hotel section");
                }

                for (let hotelOption of hotelItem?.hotelOptions) {
                    if (!isValidObjectId(hotelOption?.hotelId)) {
                        return sendErrorResponse(res, 400, "invalid hotel id");
                    }
                    const hotel = await Hotel.findOne({
                        _id: hotelOption.hotelId,
                        isDeleted: false,
                    })
                        .select("_id")
                        .lean();
                    if (!hotel) {
                        return sendErrorResponse(res, 400, "hotel not found");
                    }

                    if (!isValidObjectId(hotelOption?.roomTypeId)) {
                        return sendErrorResponse(res, 400, "invalid room type id");
                    }
                    const roomType = await RoomType.findOne({
                        _id: hotelOption?.roomTypeId,
                        isDeleted: false,
                    })
                        .select("_id")
                        .lean();
                    if (!roomType) {
                        return sendErrorResponse(res, 400, "room type not found");
                    }
                }

                // If package type is static then hotel price should be for each city
                // Otherwise hotel price should be for each hotel. So we will take lowest hotel price
                if (packageType === "static") {
                    if (hotelItem?.price && !isNaN(hotelItem?.price)) {
                        totalPrice += Number(hotelItem?.price);
                    } else {
                        return sendErrorResponse(res, 400, "add hotel price");
                    }
                } else {
                    let sortedHotelOptions = hotelItem?.hotelOptions?.sort((a, b) => {
                        return a?.price - b?.price;
                    });
                    if (sortedHotelOptions[0]?.price && !isNaN(sortedHotelOptions[0]?.price)) {
                        totalPrice += Number(sortedHotelOptions[0]?.price);
                    } else {
                        return sendErrorResponse(
                            res,
                            400,
                            "add hotel price for each selected hotels"
                        );
                    }
                }
            }

            // Validating Itineraries. Each Activities price is coming from frontend.
            // And this price is transfer included price.
            for (let itinerary of parsedItineraries) {
                for (let itineraryItem of itinerary?.itineraryItems) {
                    if (
                        !isValidObjectId(itineraryItem?.attractionId) ||
                        !isValidObjectId(itineraryItem?.activityId)
                    ) {
                        return sendErrorResponse(res, 400, "invalid attraction or activity id");
                    }
                    const activity = await AttractionActivity.findOne({
                        _id: itineraryItem?.activityId,
                        attraction: itineraryItem?.attractionId,
                        isDeleted: false,
                    })
                        .select("_id")
                        .lean();
                    if (!activity) {
                        return sendErrorResponse(res, 400, "activity not found");
                    }

                    totalPrice += Number(itineraryItem?.price);
                }
            }

            // adding airport to hotel or vice versa transfer price to total price only if isAirportTransfer is true
            // also adding hotel to hotel transfer price to total price only if isInterHotelTransfer is true
            if (isAirportTransfer === "true") {
                totalPrice += Number(airportTransferPrice);
            }
            if (isInterHotelTransfer === "true") {
                totalPrice += Number(interHotelPrice);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid tour package id");
            }
            const tourPackage = await TourPackage.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    ...req.body,
                    hotels: parsedHotels,
                    itineraries: parsedItineraries,
                    availableDates: parsedAvailableDates,
                    excludedDates: parsedExcludedDates,
                    packageThemes: parsedPackageThemes,
                    totalPrice,
                    thumbnail: thumbnailImg,
                },
                { runValidators: true, new: true }
            );
            if (!tourPackage) {
                return sendErrorResponse(res, 400, "tour package not found");
            }

            res.status(200).json(tourPackage);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getAllTourPackages: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const tourPackages = await TourPackage.find({ isDeleted: false })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalTourPackages = await TourPackage.find({ isDeleted: false }).count();

            res.status(200).json({
                totalTourPackages,
                skip: Number(limit),
                limit: Number(limit),
                tourPackages,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteTourPackage: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 500, "invalid tour package id");
            }
            const tourPackage = await TourPackage.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                { isDeleted: true }
            );
            if (!tourPackage) {
                return sendErrorResponse(res, 400, "tour package not found");
            }

            res.status(200).json({ message: "tour package successfully deleted", _id: id });
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
                .lean();
            if (!tourPackage) {
                return sendErrorResponse(res, 400, "tour package not found");
            }

            res.status(200).json(tourPackage);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getTourPackageInitialData: async (req, res) => {
        try {
            const activities = await AttractionActivity.find({
                isDeleted: false,
                isActive: true,
            })
                .populate({
                    path: "attraction",
                    select: { image: { $arrayElemAt: ["$images", 0] } },
                })
                .select(
                    "name activityType base isSharedTransferAvailable isPrivateTransferAvailable privateTransfers"
                )
                .lean();

            const tourPackageThemes = await TourPackageTheme.find({})
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({ activities, tourPackageThemes });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
