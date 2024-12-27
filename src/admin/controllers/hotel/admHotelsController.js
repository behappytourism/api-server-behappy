const { isValidObjectId } = require("mongoose");
const { default: axios } = require("axios");
const xl = require("excel4node");

const { sendErrorResponse } = require("../../../helpers");
const { Country, ApiMaster } = require("../../../models");
const { State, City, Area, Market } = require("../../../models/global");
const {
    Hotel,
    HotelBoardType,
    HotelContract,
    HotelPromotion,
    RoomType,
    HotelContact,
    HotelAmenity,
    AccommodationType,
    HotelChain,
    HotelContractGroup,
    FeaturedHotel,
} = require("../../../models/hotel");
const { hotelSchema } = require("../../validations/hotel/admHotelSchema");
const { flushRedisCache } = require("../../../config/cache");

module.exports = {
    uploadBulkHotels: async (req, res) => {
        try {
            if (!req.file) {
                return sendErrorResponse(res, 500, "csv file is required");
            }

            let csvRow = 0;
            let hotelsList = [];
            let newHotels;
            let hotelError;
            const uploadHotels = async () => {
                for (let i = 0; i < ticketsList?.length; i++) {
                    try {
                        newHotels = await Hotel.insertMany(hotelsList);
                    } catch (err) {
                        hotelError = err;
                    }
                }
            };

            fs.createReadStream(req.file?.path)
                .pipe(parse({ delimiter: "," }))
                .on("data", async function (csvrow) {
                    if (csvRow !== 0) {
                        hotelsList.push({
                            name: csvrow[0],
                            website: csvrow[1],
                            place: csvrow[2],
                            starCategory: csvrow[3],
                        });
                    }
                    csvRow += 1;
                })
                .on("end", async function () {
                    await uploadHotels();

                    if (hotelError) {
                        return sendErrorResponse(res, 400, hotelError);
                    }

                    res.status(200).json(newHotels);
                })
                .on("error", function (err) {
                    sendErrorResponse(res, 400, "something went wrong, wile parsing csv");
                });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addNewHotel: async (req, res) => {
        try {
            const {
                country,
                city,
                area,
                state,
                amenities,
                faqs,
                longitude,
                latitude,
                openDays,
                salesContacts,
                accountsContacts,
                hotelContacts,
                reservationsContacts,
                isApiConnected,
                connectedApis,
                boardTypes,
                restaurants,
                bars,
                hotelChain,
            } = req.body;

            const { _, error } = hotelSchema.validate({
                ...req.body,
                faqs: faqs ? JSON.parse(faqs) : [],
                amenities: amenities ? JSON.parse(amenities) : [],
                openDays: openDays ? JSON.parse(openDays) : [],
                salesContacts: salesContacts ? JSON.parse(salesContacts) : [],
                accountsContacts: accountsContacts ? JSON.parse(accountsContacts) : [],
                hotelContacts: hotelContacts ? JSON.parse(hotelContacts) : [],
                reservationsContacts: reservationsContacts ? JSON.parse(reservationsContacts) : [],
                connectedApis: connectedApis ? JSON.parse(connectedApis) : [],
                boardTypes: boardTypes ? JSON.parse(boardTypes) : [],
                restaurants: restaurants ? JSON.parse(restaurants) : [],
                bars: bars ? JSON.parse(bars) : [],
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let images = [];
            for (let i = 0; i < req.files?.length; i++) {
                const img = "/" + req.files[i]?.path?.replace(/\\/g, "/");
                images.push({ path: img, isRelative: true });
            }

            let parsedFaqs;
            if (faqs) {
                parsedFaqs = JSON.parse(faqs);
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({
                _id: country,
                isDeleted: false,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            if (!isValidObjectId(state)) {
                return sendErrorResponse(res, 400, "invalid state id");
            }

            const stateDetail = await State.findOne({
                _id: state,
                isDeleted: false,
                country,
            });
            if (!stateDetail) {
                return sendErrorResponse(res, 404, "state not found");
            }

            if (!isValidObjectId(city)) {
                return sendErrorResponse(res, 400, "invalid city id");
            }
            const cityDetail = await City.findOne({
                isDeleted: false,
                _id: city,
                country,
            });
            if (!cityDetail) {
                return sendErrorResponse(res, 404, "city not found");
            }

            if (area) {
                if (!isValidObjectId(area)) {
                    return sendErrorResponse(res, 400, "invalid area id");
                }
                const areaDetail = await Area.findOne({
                    _id: area,
                    country,
                    isDeleted: false,
                });
                if (!areaDetail) {
                    return sendErrorResponse(res, 404, "area not found");
                }
            }

            if (hotelChain) {
                if (!isValidObjectId(hotelChain)) {
                    return sendErrorResponse(res, 400, "invalid hotel chain id");
                }
                const hotelChainDetail = await HotelChain.findOne({
                    _id: hotelChain,
                    isActive: true,
                });
                if (!hotelChainDetail) {
                    return sendErrorResponse(res, 404, "hotel chain not found");
                }
            }

            let parsedBoardTypes = boardTypes ? JSON.parse(boardTypes) : [];
            // const boardTypesDetail = await HotelBoardType.find({ _id: parsedBoardTypes });
            // if (boardTypesDetail.length !== parsedBoardTypes.length) {
            //     return sendErrorResponse(res, 404, "board types not found");
            // }

            let parsedAmenities = amenities ? JSON.parse(amenities) : [];
            let featuredAmenities = [];
            for (let i = 0; i < parsedAmenities?.length; i++) {
                if (parsedAmenities[i]?.isFeatured === true) {
                    featuredAmenities.push({ amenity: parsedAmenities[i]?.amenity });
                }
            }

            const newHotel = new Hotel({
                ...req.body,
                isPublished: true,
                images,
                country,
                faqs: parsedFaqs,
                amenities: parsedAmenities,
                featuredAmenities,
                geoCode: {
                    longitude,
                    latitude,
                },
                openDays: openDays ? JSON.parse(openDays) : [],
                connectedApis: isApiConnected ? JSON.parse(connectedApis) : [],
                boardTypes: parsedBoardTypes,
                restaurants: restaurants ? JSON.parse(restaurants) : [],
                bars: bars ? JSON.parse(bars) : [],
                area: area ? area : undefined,
                hotelChain: hotelChain ? hotelChain : undefined,
                hotelLoadedFrom: "contract",
            });

            const newHotelContact = new HotelContact({
                hotel: newHotel?._id,
                accountsContacts: accountsContacts ? JSON.parse(accountsContacts) : [],
                hotelContacts: hotelContacts ? JSON.parse(hotelContacts) : [],
                reservationsContacts: reservationsContacts ? JSON.parse(reservationsContacts) : [],
                salesContacts: salesContacts ? JSON.parse(salesContacts) : [],
            });
            await newHotelContact.save();

            await newHotel.save();

            res.status(200).json({
                message: "hotel uploaded successfully",
                _id: newHotel._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateHotel: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                country,
                state,
                city,
                area,
                amenities,
                faqs,
                longitude,
                latitude,
                openDays,
                salesContacts,
                accountsContacts,
                hotelContacts,
                reservationsContacts,
                oldImages,
                isApiConnected,
                connectedApis,
                boardTypes,
                restaurants,
                bars,
                hotelChain,
            } = req.body;

            const { _, error } = hotelSchema.validate({
                ...req.body,
                faqs: faqs ? JSON.parse(faqs) : [],
                amenities: amenities ? JSON.parse(amenities) : [],
                openDays: openDays ? JSON.parse(openDays) : [],
                salesContacts: salesContacts ? JSON.parse(salesContacts) : [],
                accountsContacts: accountsContacts ? JSON.parse(accountsContacts) : [],
                hotelContacts: hotelContacts ? JSON.parse(hotelContacts) : [],
                reservationsContacts: reservationsContacts ? JSON.parse(reservationsContacts) : [],
                oldImages: oldImages ? JSON.parse(oldImages) : [],
                connectedApis: connectedApis ? JSON.parse(connectedApis) : [],
                boardTypes: boardTypes ? JSON.parse(boardTypes) : [],
                restaurants: restaurants ? JSON.parse(restaurants) : [],
                bars: bars ? JSON.parse(bars) : [],
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            let parsedOldImages = [];
            if (oldImages) {
                parsedOldImages = JSON.parse(oldImages);
            }

            let newImages = [...parsedOldImages];
            for (let i = 0; i < req.files?.length; i++) {
                const img = "/" + req.files[i]?.path?.replace(/\\/g, "/");
                newImages.push({ path: img, isRelative: true });
            }

            let parsedFaqs;
            if (faqs) {
                parsedFaqs = JSON.parse(faqs);
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({
                _id: country,
                isDeleted: false,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            if (!isValidObjectId(state)) {
                return sendErrorResponse(res, 400, "invalid state id");
            }

            const stateDetail = await State.findOne({
                _id: state,
                isDeleted: false,
                country,
            });
            if (!stateDetail) {
                return sendErrorResponse(res, 404, "state not found");
            }

            if (!isValidObjectId(city)) {
                return sendErrorResponse(res, 400, "invalid city id");
            }
            const cityDetail = await City.findOne({
                isDeleted: false,
                _id: city,
                country,
            });
            if (!cityDetail) {
                return sendErrorResponse(res, 404, "city not found");
            }

            if (area) {
                if (!isValidObjectId(area)) {
                    return sendErrorResponse(res, 400, "invalid area id");
                }
                const areaDetail = await Area.findOne({
                    _id: area,
                    country,
                    isDeleted: false,
                });
                if (!areaDetail) {
                    return sendErrorResponse(res, 404, "area not found");
                }
            }

            if (hotelChain) {
                if (!isValidObjectId(hotelChain)) {
                    return sendErrorResponse(res, 400, "invalid hotel chain id");
                }
                const hotelChainDetail = await HotelChain.findOne({
                    _id: hotelChain,
                    isActive: true,
                });
                if (!hotelChainDetail) {
                    return sendErrorResponse(res, 404, "hotel chain not found");
                }
            }

            let parsedBoardTypes = boardTypes ? JSON.parse(boardTypes) : [];
            // const boardTypesDetail = await HotelBoardType.find({ _id: parsedBoardTypes });
            // if (boardTypesDetail.length !== parsedBoardTypes.length) {
            //     return sendErrorResponse(res, 404, "board types not found");
            // }

            let parsedAmenities = amenities ? JSON.parse(amenities) : [];
            let featuredAmenities = [];
            for (let i = 0; i < parsedAmenities?.length; i++) {
                if (parsedAmenities[i]?.isFeatured === true) {
                    featuredAmenities.push({ amenity: parsedAmenities[i]?.amenity });
                }
            }

            const hotel = await Hotel.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    ...req.body,
                    isPublished: true,
                    images: newImages,
                    country,
                    faqs: parsedFaqs,
                    amenities: parsedAmenities,
                    featuredAmenities,
                    geoCode: {
                        longitude,
                        latitude,
                    },
                    openDays: openDays ? JSON.parse(openDays) : [],
                    connectedApis: isApiConnected ? JSON.parse(connectedApis) : [],
                    boardTypes: parsedBoardTypes,
                    restaurants: restaurants ? JSON.parse(restaurants) : [],
                    bars: bars ? JSON.parse(bars) : [],
                    area: area ? area : undefined,
                    hotelChain: hotelChain ? hotelChain : undefined,
                },
                { runValidators: true, new: true }
            );
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            await HotelContact.findOneAndUpdate(
                { hotel: hotel?._id },
                {
                    hotel: hotel?._id,
                    accountsContacts: accountsContacts ? JSON.parse(accountsContacts) : [],
                    hotelContacts: hotelContacts ? JSON.parse(hotelContacts) : [],
                    reservationsContacts: reservationsContacts
                        ? JSON.parse(reservationsContacts)
                        : [],
                    salesContacts: salesContacts ? JSON.parse(salesContacts) : [],
                },
                { upsert: true }
            );

            await FeaturedHotel.findOneAndUpdate(
                { hotelId: hotel?._id },
                {
                    hotelName: hotel?.hotelName,
                    thumbnail: {
                        path: hotel?.images[0]?.path,
                        isRelative: hotel?.images[0]?.isRelative,
                    },
                }
            );

            res.status(200).json({
                message: "hotel successfully updated",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteHotel: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotel = await Hotel.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { isDeleted: true }
            );
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found or already deleted");
            }

            await FeaturedHotel.findOneAndDelete({ hotelId: hotel?._id });

            res.status(200).json({
                message: "hotel successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllHotels: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                search,
                loadedFrom,
                status,
                starCategory,
                country,
            } = req.query;

            const filters = { isDeleted: false };

            if (search && search !== "") {
                filters.hotelName = { $regex: search, $options: "i" };
            }
            if (loadedFrom && loadedFrom !== "") {
                const providerIdCond = { $exists: true, $ne: null };
                if (loadedFrom === "contract") filters.hotelLoadedFrom = loadedFrom;
                else if (loadedFrom === "hotel-bed") filters.hbId = providerIdCond;
                else if (loadedFrom === "ottila") filters.ottilaId = providerIdCond;
            }
            if (starCategory && starCategory !== "") {
                filters.starCategory = starCategory;
            }
            if (status && status !== "") {
                if (status === "unpublished") {
                    filters.isPublished = false;
                } else if (status === "published") {
                    filters.isPublished = true;
                } else if (status === "inactive") {
                    filters.isActive = false;
                } else if (status === "active") {
                    filters.isActive = true;
                }
            }
            if (country && country !== "") {
                filters.country = country;
            }

            const hotels = await Hotel.find(filters)
                .sort({ createdAt: -1 })
                .populate("country", "countryName")
                .populate("city", "cityName")
                .populate("state", "stateName")
                .select(
                    "hotelName isPublished city state country starCategory isActive updatedAt createdAt"
                )
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalHotels = await Hotel.find(filters).count();

            res.status(200).json({
                hotels,
                totalHotels,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllHotelsNamesWithAddress: async (req, res) => {
        try {
            const { country } = req.query;

            const filters = { isDeleted: false, isPublished: true, isActive: true };
            if (country) {
                filters.country = country;
            } else {
                return sendErrorResponse(res, 400, "country is required");
            }

            const hotels = await Hotel.find(filters).select("hotelName address").lean();

            res.status(200).json(hotels);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getHotelInitialData: async (req, res) => {
        try {
            const amenities = await HotelAmenity.find({}).sort({
                name: 1,
            });
            // .collation({ locale: "en", caseLevel: true });

            const accommodationTypes = await AccommodationType.find({}).sort({
                accommodationTypeName: 1,
            });
            // .collation({ locale: "en", caseLevel: true });

            const apis = await ApiMaster.find({ type: "hotel" });

            const boardTypes = await HotelBoardType.find({});
            const hotelChains = await HotelChain.find({});

            res.status(200).json({ amenities, accommodationTypes, apis, boardTypes, hotelChains });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotel: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const hotel = await Hotel.findOne({ _id: id, isDeleted: false })
                .populate("amenities.amenity")
                .lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "invalid hotel id");
            }

            const hotelContactDetails = await HotelContact.findOne({
                hotel: hotel?._id,
            }).lean();

            res.status(200).json({ ...hotel, ...hotelContactDetails });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleCityHotelsWithRoomTypesAndBoardTypes: async (req, res) => {
        try {
            const { cityId } = req.params;

            if (!isValidObjectId(cityId)) {
                return sendErrorResponse(res, 400, "invalid city id");
            }
            const city = await City.findOne({ _id: cityId, isDeleted: false }).lean();
            if (!city) {
                return sendErrorResponse(res, 400, "city not found");
            }

            const hotels = await Hotel.find({
                isPublished: true,
                isDeleted: false,
                isActive: true,
                city: cityId,
            })
                .populate({ path: "country", select: "countryName" })
                .populate({ path: "state", select: "stateName" })
                .populate({ path: "city", select: "cityName" })
                .populate({
                    path: "roomTypes",
                    match: {
                        isDeleted: false,
                        isActive: true,
                    },
                    select: "roomName",
                })
                .populate({ path: "boardTypes", select: "boardName boardShortName" })
                .select({
                    _id: 1,
                    hotelName: 1,
                    country: 1,
                    state: 1,
                    city: 1,
                    address: 1,
                    starCategory: 1,
                    roomTypes: 1,
                    boardTypes: 1,
                    image: { $arrayElemAt: ["$images", 0] },
                })
                .sort({ hotelName: 1 })
                // .collation({ locale: "en", caseLevel: true })
                .lean();

            res.status(200).json({ city, hotels });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelsRoomTypesAndBoardTypes: async (req, res) => {
        try {
            const { hotelId } = req.params;

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
                isActive: true,
                isPublished: true,
            });
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const roomTypes = await RoomType.find({
                hotel: hotelId,
                isDeleted: false,
            });
            const boardTypes = await HotelBoardType.find({
                _id: hotel.boardTypes,
                isDeleted: false,
            });

            res.status(200).json({ roomTypes, boardTypes });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelsRoomTypesAndContractGroups: async (req, res) => {
        try {
            const { hotelId } = req.params;

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
                isActive: true,
                isPublished: true,
            });
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const roomTypes = await RoomType.find({
                hotel: hotelId,
                isDeleted: false,
            });
            const contractGroups = await HotelContractGroup.find({
                hotel: hotelId,
            });

            res.status(200).json({ roomTypes, contractGroups });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getContractInitialData: async (req, res) => {
        try {
            const { hotelId, contractGroupId } = req.body;

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            if (!isValidObjectId(contractGroupId)) {
                return sendErrorResponse(res, 400, "invalid contract group id");
            }

            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
                isActive: true,
                isPublished: true,
            });
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const roomTypes = await RoomType.find({
                hotel: hotelId,
                isDeleted: false,
            });
            const boardTypes = await HotelBoardType.find({
                _id: hotel.boardTypes,
                isDeleted: false,
            });
            const markets = await Market.find({ isDeleted: false }).sort({ createdAt: -1 });

            const contracts = await HotelContract.find({
                isDeleted: false,
                hotel: hotelId,
                contractGroup: contractGroupId,
                isSpecialRate: false,
            })
                .select("rateCode rateName")
                .lean();

            res.status(200).json({ roomTypes, boardTypes, markets, contracts });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getPromotionInitialData: async (req, res) => {
        try {
            const { hotelId } = req.params;

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
                isActive: true,
                isPublished: true,
            });
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const roomTypes = await RoomType.find({
                hotel: hotelId,
                isDeleted: false,
            });
            const boardTypes = await HotelBoardType.find({
                _id: hotel.boardTypes,
                // isDeleted: false,
            });
            const contractGroups = await HotelContractGroup.find({
                hotel: hotelId,
            });
            const promotions = await HotelPromotion.find({
                hotel: hotelId,
                isDeleted: false,
            });
            const markets = await Market.find({ isDeleted: false }).sort({ createdAt: -1 });

            res.status(200).json({
                roomTypes,
                boardTypes,
                promotions,
                markets,
                contractGroups,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllHotelsWithRoomTypesAndContractGroups: async (req, res) => {
        try {
            const hotels = await Hotel.find({
                isDeleted: false,
                isPublished: true,
                isContractAvailable: true,
            })
                .populate("country", "countryName")
                .populate("state", "stateName")
                .populate("city", "cityName")
                .populate({
                    path: "roomTypes",
                    match: { isDeleted: false },
                    select: "roomName",
                })
                .populate({ path: "contractGroups", match: { isDeleted: false } })
                .select("hotelName country state city starCategory contractGroups roomTypes")
                .lean();

            res.status(200).json(hotels);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelInfo: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const hotel = await Hotel.findOne({ _id: id, isDeleted: false })
                .populate("country", "countryName")
                .populate("state", "stateName")
                .populate("city", "cityName")
                .select("hotelName country state city address starCategory")
                .lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            res.status(200).json(hotel);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getHotelComparisonList: async (req, res) => {
        try {
            const { data } = await axios.get(
                `https://test.mytravellerschoice.com/api/v1/hotels/all`
            );

            const liveHotels = await Hotel.find({ isDeleted: false })
                .populate("country", "countryName")
                .populate("state", "stateName")
                .populate("city", "cityName")
                .sort({ hotelName: 1 })
                // .collation({ locale: "en", caseLevel: true })
                .lean();

            let returnHotels = [];
            for (let i = 0; i < liveHotels.length; i++) {
                if (liveHotels[i].hbId) {
                    for (let j = 0; j < data.length; j++) {
                        if (liveHotels[i]?.hbId === data[j]?.hbId) {
                            returnHotels.push({
                                hbId: liveHotels[i]?.hbId || null,
                                liveHotelName: liveHotels[i].hotelName,
                                liveHotelCountry: liveHotels[i].country,
                                liveHotelState: liveHotels[i].state,
                                liveHotelCity: liveHotels[i].city,
                                liveHotelStarCategory: liveHotels[i].starCategory,
                                testHotelName: data[j].hotelName,
                                testHotelCountry: data[j].country,
                                testHotelState: data[j].state,
                                testHotelCity: data[j].city,
                                testHotelStarCategory: data[j].starCategory,
                            });
                        }
                    }
                } else {
                    returnHotels.push({
                        hbId: liveHotels[i]?.hbId || null,
                        liveHotelName: liveHotels[i].hotelName,
                        liveHotelCountry: liveHotels[i].country,
                        liveHotelState: liveHotels[i].state,
                        liveHotelCity: liveHotels[i].city,
                        liveHotelStarCategory: liveHotels[i].starCategory,
                        testHotelName: "",
                        testHotelCountry: "",
                        testHotelState: "",
                        testHotelCity: "",
                        testHotelStarCategory: "",
                    });
                }
            }

            res.status(200).json(returnHotels);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getHotelComparisonListExcelSheet: async (req, res) => {
        try {
            const { data } = await axios.get(
                `https://test.mytravellerschoice.com/api/v1/hotels/all`
            );

            const liveHotels = await Hotel.find({ isDeleted: false })
                .populate("country", "countryName")
                .populate("state", "stateName")
                .populate("city", "cityName")
                .sort({ hotelName: 1 })
                // .collation({ locale: "en", caseLevel: true })
                .lean();

            let returnHotels = [];
            for (let i = 0; i < liveHotels.length; i++) {
                if (liveHotels[i].hbId) {
                    for (let j = 0; j < data.length; j++) {
                        if (liveHotels[i]?.hbId === data[j]?.hbId) {
                            returnHotels.push({
                                hbId: liveHotels[i]?.hbId || null,
                                liveHotelName: liveHotels[i].hotelName,
                                liveHotelCountry: liveHotels[i].country,
                                liveHotelState: liveHotels[i].state,
                                liveHotelCity: liveHotels[i].city,
                                liveHotelStarCategory: liveHotels[i].starCategory,
                                testHotelName: data[j].hotelName,
                                testHotelCountry: data[j].country,
                                testHotelState: data[j].state,
                                testHotelCity: data[j].city,
                                testHotelStarCategory: data[j].starCategory,
                            });
                        }
                    }
                } else {
                    returnHotels.push({
                        hbId: liveHotels[i]?.hbId || null,
                        liveHotelName: liveHotels[i].hotelName,
                        liveHotelCountry: liveHotels[i].country,
                        liveHotelState: liveHotels[i].state,
                        liveHotelCity: liveHotels[i].city,
                        liveHotelStarCategory: liveHotels[i].starCategory,
                        testHotelName: "",
                        testHotelCountry: "",
                        testHotelState: "",
                        testHotelCity: "",
                        testHotelStarCategory: "",
                    });
                }
            }

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet("Orders");

            const titleStyle = wb.createStyle({
                font: {
                    bold: true,
                },
            });

            ws.cell(1, 1).string("#").style(titleStyle);
            ws.cell(1, 2).string("Hotelbed Id").style(titleStyle);
            ws.cell(1, 3).string("Hotel - contract").style(titleStyle);
            ws.cell(1, 4).string("Hotel - Hotelbed").style(titleStyle);

            for (let i = 0; i < returnHotels.length; i++) {
                ws.cell(i + 2, 1).number(i + 1);
                ws.cell(i + 2, 2).string(
                    returnHotels[i]?.hbId ? `${returnHotels[i]?.hbId}` : "N/A"
                );
                ws.cell(i + 2, 3).string(
                    returnHotels[i]?.liveHotelName
                        ? `${returnHotels[i]?.liveHotelName} - ${returnHotels[i]?.liveHotelCity?.cityName}, ${returnHotels[i]?.liveHotelState?.stateName}, ${returnHotels[i]?.liveHotelCountry?.countryName}`
                        : "N/A"
                );
                ws.cell(i + 2, 4).string(
                    returnHotels[i]?.testHotelName
                        ? `${returnHotels[i]?.testHotelName} - ${returnHotels[i]?.testHotelState?.stateName}, ${returnHotels[i]?.testHotelCountry?.countryName}`
                        : "N/A"
                );
            }

            wb.write(`FileName.xlsx`, res);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    clearHotelCache: async (req, res) => {
        try {
            await flushRedisCache();

            res.status(200).json({ message: "success" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadHotelsListAsExcel: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                search,
                loadedFrom,
                status,
                starCategory,
                country,
            } = req.query;

            const filters = { isDeleted: false };

            if (search && search !== "") {
                filters.hotelName = { $regex: search, $options: "i" };
            }
            if (loadedFrom && loadedFrom !== "") {
                filters.hotelLoadedFrom = loadedFrom;
            }
            if (starCategory && starCategory !== "") {
                filters.starCategory = starCategory;
            }
            if (status && status !== "") {
                if (status === "unpublished") {
                    filters.isPublished = false;
                } else if (status === "published") {
                    filters.isPublished = true;
                } else if (status === "inactive") {
                    filters.isActive = false;
                } else if (status === "active") {
                    filters.isActive = true;
                }
            }
            if (country && country !== "") {
                filters.country = country;
            }

            const hotels = await Hotel.find(filters)
                .sort({ createdAt: -1 })
                .populate("area", "areaName")
                .populate("country", "countryName")
                .populate("city", "cityName")
                .populate("state", "stateName")
                .populate("accommodationType", "accommodationTypeName")
                .select("hotelName area city state country starCategory accommodationType")
                .limit(limit)
                .skip(limit * skip)
                .lean();

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet("hotels-list");

            const titleStyle = wb.createStyle({
                font: {
                    bold: true,
                },
            });

            ws.cell(1, 1).string("Hotel Name").style(titleStyle);
            ws.cell(1, 2).string("Area").style(titleStyle);
            ws.cell(1, 3).string("City").style(titleStyle);
            ws.cell(1, 4).string("State").style(titleStyle);
            ws.cell(1, 5).string("Country").style(titleStyle);
            ws.cell(1, 6).string("Star Category").style(titleStyle);
            ws.cell(1, 7).string("Accommodation Type").style(titleStyle);

            for (let i = 0; i < hotels?.length; i++) {
                const hotel = hotels[i];

                ws.cell(i + 2, 1).string(hotel?.hotelName || "");
                ws.cell(i + 2, 2).string(hotel?.area?.areaName || "");
                ws.cell(i + 2, 3).string(hotel?.city?.cityName || "");
                ws.cell(i + 2, 4).string(hotel?.state?.stateName || "");
                ws.cell(i + 2, 5).string(hotel?.country?.countryName || "");
                ws.cell(i + 2, 6).string(hotel?.starCategory || "");
                ws.cell(i + 2, 7).string(hotel?.accommodationType?.accommodationTypeName || "");
            }

            wb.write(`hotels-list.xlsx`, res);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
