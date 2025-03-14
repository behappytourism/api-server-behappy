const { isValidObjectId, Types } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const {
    Hotel,
    RoomType,
    HotelBedRoomType,
    HotelAvailSearchResult,
    HotelContract,
    HotelPromotion,
    HotelAddOn,
    HotelBoardType,
    HotelAllocation,
} = require("../../../models/hotel");
const { getDates } = require("../../../utils");
const { getSingleHotelAvailability } = require("../../helpers/hotel/hotelAvailabilityHelpers");
const {
    hotelAvailabilitySchema,
    singleHotelAvailabilitySchema,
    singleRoomRateSchema,
} = require("../../validations/hotel/hotelAvailability.schema");
const { State, City, Area } = require("../../../models/global");
const {
    getSingleHotelBedAvailability,
    getSingleHotelBedRate,
    getAllHotelsHbAvailability,
} = require("../../helpers/hotel/hotelBedAvailabilityHelpers");
const {
    getVervotechMatchedHotelRooms,
    convertSqftToSqMeter,
} = require("../../helpers/hotel/vervotechAvailabilityHelper");

const { addToJsonNestedFields } = require(".././../../b2b/utils/file");

const { PROVIDER_IDS, HOTEL_PROVIDERS } = require("../../utils/constants");
const { B2BMarkupProfile, Reseller } = require("../../models");
const {
    B2bClientHotelMarkup,
    B2bSubAgentHotelMarkup,
    B2BClientStarCategoryMarkup,
    B2BSubAgentStarCategoryMarkup,
    B2BHotelResellerSettings,
} = require("../../models/hotel");
const { Country } = require("../../../models");
const B2BClientHotelMarkup = require("../../models/hotel/b2bClientHotelMarkup.model");
const B2BGlobalConfiguration = require("../../../admin/models/b2bGlobalConfiguration.model");
const { createHotelLog } = require("../../helpers/hotel/hotelLogsHelpers");
const MarketStrategy = require("../../../admin/models/marketStrategy.model");
const { saveCustomCache, getSavedCache } = require("../../../config/cache");
const {
    getOttilaHotelsAvailabilityByHCode,
    getSingleOttilaHotelAvailability,
    createOttilaPreBooking,
} = require("../../helpers/hotel/ottilaAvailabilityHelpers");
const OttilaRoomType = require("../../../models/hotel/ottilaRoomType.model");
const B2BHotelProvider = require("../../models/hotel/b2bHotelProviders.model");
const {
    getIolxHotelAvailabilityByHotelCodes,
    getHotelAvailabilitiesFromIOLX,
    getRoomsAvailabilityFromIOLX,
} = require("../../helpers/hotel/iolxAvailabilityHelper");
const OttilaRoomRateInfo = require("../../../models/hotel/ottilaRoomRateInfo.model");

module.exports = {
    getSearchSuggestions: async (req, res) => {
        try {
            const { search } = req.query;

            const searchWords = search?.toLowerCase()?.split(" ");

            if (!search || search?.length < 3) {
                return sendErrorResponse(res, 400, "invalid search. atleast 3 characters required");
            }

            console.time("fetching");
            let availableHotels = [];
            let availableCities = [];
            let availableAreas = [];
            const b2bHotelResellerSettings = await B2BHotelResellerSettings.findOne({
                resellerId:
                    req.reseller?.role === "reseller"
                        ? req.reseller?._id
                        : req.reseller?.referredBy,
            }).lean();
            if (b2bHotelResellerSettings) {
                availableHotels = b2bHotelResellerSettings.availableHotels || [];
                availableCities = b2bHotelResellerSettings.availableCities || [];
                availableAreas = b2bHotelResellerSettings.availableAreas || [];
            }

            let states = await getSavedCache("suggestion-states");
            if (!states || states?.length < 1) {
                states = await State.find({ isDeleted: false }).select("_id stateName").lean();
                saveCustomCache("suggestion-states", states, 60 * 60 * 24 * 10); // 10 days
            }
            let cities = await getSavedCache("suggestion-cities");
            if (!cities || cities?.length < 1) {
                cities = await City.find({ isDeleted: false })
                    .populate("propertyCount")
                    .populate("country", "_id countryName")
                    .populate("state", "_id stateName")
                    .select("_id cityName propertyCount country state")
                    .lean();
                saveCustomCache("suggestion-cities", cities, 60 * 60 * 24 * 10); // 10 days
            }
            let areas = await getSavedCache("suggestion-areas");
            if (!areas || areas?.length < 1) {
                areas = await Area.find({ isDeleted: false })
                    .populate("propertyCount")
                    .populate("country", "_id countryName")
                    .populate("state", "_id stateName")
                    .populate("city", "_id cityName")
                    .select("_id areaName propertyCount country state city")
                    .lean();
                saveCustomCache("suggestion-areas", areas, 60 * 60 * 24 * 10); // 10 days
            }
            let hotels = await getSavedCache("suggestion-hotels");
            if (!hotels || hotels.length < 1) {
                hotels = await Hotel.find({
                    isDeleted: false,
                    isActive: true,
                    isPublished: true,
                })
                    .populate("country", "countryName")
                    .populate("state", "stateName")
                    .populate("city", "cityName")
                    .select("_id hotelName country, city state")
                    .lean();
                saveCustomCache("suggestion-hotels", hotels, 60 * 60 * 24 * 10); // 10 days
            }

            let promises = [];

            promises.push(
                (async () => {
                    const filteredStatesIds = states
                        ?.filter((state) =>
                            state?.stateName
                                ?.replaceAll(" ", "")
                                ?.toLowerCase()
                                ?.includes(search?.replaceAll(" ", "")?.toLowerCase())
                        )
                        ?.map((state) => state?._id?.toString());

                    return cities
                        ?.filter((city) => {
                            return (
                                (searchWords?.every((item) => {
                                    return city?.cityName
                                        ?.replaceAll(" ", "")
                                        ?.toLowerCase()
                                        ?.includes(item);
                                }) ||
                                    filteredStatesIds?.includes(city?.state?._id?.toString())) &&
                                (availableCities?.length < 1 ||
                                    availableCities?.some(
                                        (item) => item?.toString() === city?._id?.toString()
                                    ))
                            );
                        })
                        ?.sort((a, b) => b?.propertyCount - a?.propertyCount)
                        ?.slice(0, 3)
                        ?.map((item) => {
                            return {
                                _id: item?._id,
                                suggestionType: "CITY",
                                countryName: item?.country?.countryName,
                                stateName: item?.state?.stateName,
                                cityName: item?.cityName,
                                cityId: item?._id,
                                propertyCount: item?.propertyCount,
                            };
                        });
                })()
            );

            promises.push(
                (async () => {
                    return areas
                        ?.filter((area) => {
                            return (
                                searchWords?.every((item) => {
                                    return area?.areaName
                                        ?.replaceAll(" ", "")
                                        ?.toLowerCase()
                                        ?.includes(item);
                                }) &&
                                (availableAreas?.length < 1 ||
                                    availableAreas?.some(
                                        (item) => item?.toString() === area?._id?.toString()
                                    ))
                            );
                        })
                        ?.sort((a, b) => b?.propertyCount - a?.propertyCount)
                        ?.slice(0, 3)
                        ?.map((item) => {
                            return {
                                _id: item?._id,
                                suggestionType: "AREA",
                                countryName: item?.country?.countryName,
                                stateName: item?.state?.stateName,
                                cityName: item?.city?.cityName,
                                areaName: item?.areaName,
                                areaId: item?._id,
                                propertyCount: item?.propertyCount,
                            };
                        });
                })()
            );

            function doSearch(hotel) {
                const words = [...searchWords];
                let sliceValue = 1;
                let searchHotelWord, searchLocationWord;

                do {
                    searchHotelWord = words?.slice(0, -sliceValue)?.join("")?.trim();
                    searchLocationWord = words?.slice(-sliceValue)?.join("")?.trim();

                    if (
                        hotel?.hotelName
                            ?.replaceAll(" ", "")
                            ?.toLowerCase()
                            ?.includes(searchHotelWord) &&
                        (hotel?.country?.countryName
                            ?.replaceAll(" ", "")
                            ?.toLowerCase()
                            ?.includes(searchLocationWord) ||
                            hotel?.city?.cityName
                                ?.replaceAll(" ", "")
                                ?.toLowerCase()
                                ?.includes(searchLocationWord) ||
                            hotel?.state?.stateName
                                ?.replaceAll(" ", "")
                                ?.toLowerCase()
                                ?.includes(searchLocationWord))
                    ) {
                        return true;
                    }

                    sliceValue++;
                } while (searchHotelWord && searchLocationWord);

                return false;
            }

            promises.push(
                (async () => {
                    const filteredHotels = hotels?.filter((hotel) => {
                        return (
                            (searchWords?.every((item) => {
                                return hotel?.hotelName
                                    ?.replaceAll(" ", "")
                                    ?.toLowerCase()
                                    ?.includes(item);
                            }) ||
                                doSearch(hotel)) &&
                            (availableHotels?.length < 1 ||
                                availableHotels?.some(
                                    (item) => item?.toString() === hotel?._id?.toString()
                                ))
                        );
                    });
                    filteredHotels?.forEach((hotel, index) => {
                        const searchWord = search?.replaceAll(" ", "")?.toLowerCase();
                        const hotelName = hotel?.hotelName?.replaceAll(" ", "")?.toLowerCase();
                        if (hotelName === searchWord || hotelName?.startsWith(searchWord)) {
                            const hotelToMove = filteredHotels?.splice(index, 1);
                            hotelToMove[0] && filteredHotels?.unshift(hotelToMove[0]);
                        }
                    });
                    // Prioritize a specific country in to the top
                    filteredHotels?.sort((a, b) => {
                        const country = "united arab emirates";
                        if (
                            a?.country?.countryName === country &&
                            b?.country?.countryName !== country
                        ) {
                            return -1;
                        } else if (
                            a?.country?.countryName !== country &&
                            b?.country?.countryName === country
                        ) {
                            return 1;
                        } else {
                            return 0;
                        }
                    });
                    const result = filteredHotels?.slice(0, 5)?.map((item) => {
                        return {
                            _id: item?._id,
                            suggestionType: "HOTEL",
                            countryName: item?.country?.countryName,
                            stateName: item?.state?.stateName,
                            cityName: item?.city?.cityName,
                            hotelName: item?.hotelName,
                            hotelId: item?._id,
                        };
                    });
                    return result;
                })()
            );

            const response = await Promise.all(promises);

            console.timeEnd("fetching");

            res.status(200).json({ cities: response[0], areas: response[1], hotels: response[2] });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    searchHotelAvailability: async (req, res) => {
        try {
            const { searchQuery, fromDate, toDate, rooms, nationality, priceType } = req.body;
            const {
                priceFrom,
                priceTo,
                searchId,
                sortBy,
                starCategories,
                accommodationTypes,
                chains,
                hotelGroups,
                discountTypes, // earlybird discount, exclusive, special.. etc
                boardTypes,
                amenities,
                skip = 0,
                limit = 10,
                featured,
            } = req.query;

            const { _, error } = hotelAvailabilitySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let returnFilters;
            let searchResult;
            let returnSearchId = searchId;
            let totalHotels = 0;
            if (searchId) {
                const availResult = await HotelAvailSearchResult.findOne({
                    _id: searchId,
                    resellerId: req.reseller?._id,
                })
                    .select({
                        rooms: 0,
                        fromDate: 0,
                        toDate: 0,
                        hotelBedRowRes: 0,
                    })
                    .lean();

                searchResult = [...availResult?.hotels];
                returnFilters = availResult?.filters;
                totalHotels = availResult.totalHotels;
            }

            if (!searchResult) {
                if (!isValidObjectId(searchQuery.id)) {
                    return sendErrorResponse(res, 400, "invalid search id");
                }

                const dates = getDates(fromDate, toDate);
                if (
                    new Date(fromDate) >= new Date(toDate) ||
                    new Date(fromDate) < new Date(new Date().setHours(0, 0, 0, 0))
                ) {
                    return sendErrorResponse(
                        res,
                        400,
                        "invalid dates. Please select a valid checkin and checkout dates"
                    );
                }
                const noOfNights = dates.length - 1;

                let availableHotels = [];
                let availableCities = [];
                let availableAreas = [];
                const b2bHotelResellerSettings = await B2BHotelResellerSettings.findOne({
                    resellerId:
                        req.reseller?.role === "reseller"
                            ? req.reseller?._id
                            : req.reseller?.referredBy,
                }).lean();
                if (b2bHotelResellerSettings) {
                    availableHotels = b2bHotelResellerSettings.availableHotels || [];
                    availableCities = b2bHotelResellerSettings.availableCities || [];
                    availableAreas = b2bHotelResellerSettings.availableAreas || [];
                }

                const filters = {};

                if (
                    searchQuery.suggestionType === "CITY" &&
                    (availableCities?.length < 1 ||
                        availableCities?.some(
                            (item) => item?.toString() === searchQuery.id?.toString()
                        ))
                ) {
                    filters.city = Types.ObjectId(searchQuery.id);
                } else if (
                    searchQuery.suggestionType === "AREA" &&
                    (availableAreas?.length < 1 ||
                        availableAreas?.some(
                            (item) => item?.toString() === searchQuery.id?.toString()
                        ))
                ) {
                    filters.area = searchQuery.id;
                } else {
                    return sendErrorResponse(
                        res,
                        400,
                        "invalid search query, please try with different one"
                    );
                }

                // else if (searchQuery.suggestionType === "STATE") {
                //     filters.state = Types.ObjectId(searchQuery.id);
                // }

                if (availableHotels?.length > 0) {
                    filters._id = availableHotels;
                }

                console.time("my-time");
                let tempLimit = featured ? 20 : 2000;

                let hotels = [];
                if (searchQuery.id === "64cb62341e2b74a2319af523") {
                    hotels = await Hotel.find(
                        {
                            ...filters,
                            isDeleted: false,
                            isPublished: true,
                            isActive: true,
                            $or: [{ isContractAvailable: true }, { isApiConnected: true }],
                        },
                        { images: { $slice: 1 } }
                    )
                        .populate("boardTypes")
                        .populate("country", "countryName")
                        .populate("state", "stateName")
                        .populate("city", "cityName")
                        .populate("accommodationType")
                        .populate("hotelChain")
                        .populate("featuredAmenities.amenity")
                        .limit(tempLimit)
                        .select({
                            _id: 1,
                            hotelName: 1,
                            address: 1,
                            website: 1,
                            starCategory: 1,
                            openDays: 1,
                            distanceFromCity: 1,
                            country: 1,
                            state: 1,
                            city: 1,
                            hbId: 1,
                            isApiConnected: 1,
                            boardTypes: 1,
                            accommodationType: 1,
                            hotelChain: 1,
                            // amenities: 1,
                            featuredAmenities: 1,
                            roomTypes: 1,
                            isContractAvailable: 1,
                            // hotelGroup: 1,
                            ottilaId: 1,
                            iolxId: 1,
                        })
                        .lean()
                        .cache();
                } else {
                    hotels = await Hotel.find(
                        {
                            ...filters,
                            isDeleted: false,
                            isPublished: true,
                            isActive: true,
                            $or: [{ isContractAvailable: true }, { isApiConnected: true }],
                        },
                        { images: { $slice: 1 } }
                    )
                        .populate("boardTypes")
                        .populate("country", "countryName")
                        .populate("state", "stateName")
                        .populate("city", "cityName")
                        .populate("accommodationType")
                        .populate("hotelChain")
                        .populate("featuredAmenities.amenity")
                        .limit(tempLimit)
                        .select({
                            _id: 1,
                            hotelName: 1,
                            address: 1,
                            website: 1,
                            starCategory: 1,
                            openDays: 1,
                            distanceFromCity: 1,
                            country: 1,
                            state: 1,
                            city: 1,
                            hbId: 1,
                            isApiConnected: 1,
                            boardTypes: 1,
                            accommodationType: 1,
                            hotelChain: 1,
                            // amenities: 1,
                            featuredAmenities: 1,
                            roomTypes: 1,
                            isContractAvailable: 1,
                            // hotelGroup: 1,
                            ottilaId: 1,
                            iolxId: 1,
                        })
                        .lean();
                }

                console.log("Hotels Length", hotels?.length);
                console.timeEnd("my-time");
                console.time("other db time");

                if (hotels?.length < 1) {
                    return res.status(200).json({ hotels: [] });
                }

                // Setting FeaturedAmenities
                hotels = hotels?.map((hotel) => {
                    return {
                        ...hotel,
                        featuredAmenities: hotel?.featuredAmenities
                            ?.filter((item) => {
                                return item?.amenity?.name;
                            })
                            ?.map((item) => {
                                return {
                                    _id: item?._id,
                                    name: item?.amenity?.name,
                                    icon: item?.amenity?.icon,
                                };
                            }),
                    };
                });

                const date1 = new Date();
                const date2 = new Date(fromDate);
                const diffTime = Math.abs(date2 - date1);
                const bookBefore = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                const totalAdults = rooms?.reduce((a, b) => a + b?.noOfAdults, 0);
                const totalChildren = rooms?.reduce((a, b) => a + b?.noOfChildren, 0);

                if (nationality && nationality !== "") {
                    const nationalityDetail = await Country.findOne({
                        isocode: nationality?.toUpperCase(),
                    }).cache();
                    if (!nationalityDetail) {
                        return sendErrorResponse(res, 400, "invalid nationality code");
                    }
                }

                let marketStrategy;
                if (req.reseller.role === "reseller") {
                    marketStrategy = await MarketStrategy.findOne({
                        _id: req.reseller?.marketStrategy,
                    });
                } else {
                    const mainAgent = await Reseller.findById({
                        _id: req.reseller?.referredBy,
                    })
                        .select("marketStrategy")
                        .lean();
                    marketStrategy = await MarketStrategy.findOne({
                        _id: mainAgent?.marketStrategy,
                    });
                }

                // TODO:
                // cache markup
                let profileMarkup;
                if (req.reseller.role === "reseller") {
                    profileMarkup = await B2BMarkupProfile.findOne({
                        resellerId: req.reseller?._id,
                    });
                } else {
                    profileMarkup = await B2BMarkupProfile.findOne({
                        resellerId: req.reseller?.referredBy,
                    });
                }

                let apiOccupanciesArr = [
                    {
                        rooms: rooms?.length,
                        adults: 0,
                        children: 0,
                        paxes: [],
                    },
                ];
                rooms?.forEach((item) => {
                    apiOccupanciesArr[0].adults += Number(item?.noOfAdults) || 0;
                    apiOccupanciesArr[0].children += Number(item?.noOfChildren) || 0;
                    if (Number(item?.noOfChildren) > 0) {
                        apiOccupanciesArr[0].paxes.push(
                            ...item?.childrenAges?.map((age) => {
                                return {
                                    type: "CH",
                                    age,
                                };
                            })
                        );
                    }
                });

                const clientMarkups = await B2bClientHotelMarkup.find({
                    resellerId: req.reseller?._id,
                });
                const clientStarCategoryMarkups = await B2BClientStarCategoryMarkup.find({
                    resellerId: req.reseller?._id,
                }).lean();
                let subAgentMarkups;
                let subAgentStarCategoryMarkups;
                if (req.reseller?.role === "sub-agent") {
                    subAgentMarkups = await B2bSubAgentHotelMarkup.find({
                        resellerId: req.reseller?._id,
                    });
                    subAgentStarCategoryMarkups = await B2BSubAgentStarCategoryMarkup.find({
                        resellerId: req.reseller?._id,
                    }).lean();
                }

                const apiHotelCodes = [];
                const ottilaHotelCodes = [];
                const iolxHotelCodes = [];
                const hotelsWithHbId = {};
                const hotelsWithOttilaId = {};
                const hotelsWithIolxId = {};
                for (let hotel of hotels) {
                    if (hotel.isApiConnected === false) {
                        continue;
                    }
                    if (hotel?.hbId) {
                        apiHotelCodes.push(hotel?.hbId);
                        hotelsWithHbId[hotel?.hbId] = hotel;
                    }
                    if (hotel?.ottilaId) {
                        ottilaHotelCodes.push(hotel?.ottilaId);
                        hotelsWithOttilaId[hotel?.ottilaId] = hotel;
                    }
                    if (hotel?.iolxId) {
                        iolxHotelCodes.push(hotel?.iolxId);
                        hotelsWithIolxId[hotel?.iolxId] = hotel;
                    }
                }

                // TODO:
                // cache this fetching to increase performance
                const configuration = await B2BGlobalConfiguration.findOne({
                    settingsNumber: 1,
                }).lean();

                console.timeEnd("other db time");

                console.time("total fetch time");

                let mainPromises = [];
                let hotelBedHotels = [];
                let ottilaHotels = [];
                let hotelBedRowRes;
                let hotelPromisesRes = [];
                let iolxHotels = [];

                mainPromises.push(
                    getAllHotelsHbAvailability({
                        fromDate,
                        toDate,
                        rooms,
                        nationality,
                        apiHotelCodes,
                        hotelsWithHbId,
                        noOfNights,
                        configuration,
                        priceType,
                    })
                );

                // fetching from contract
                const getAllHotelsAvailability = async () => {
                    console.time("contract fetch");
                    const hotelPromises = [];
                    if (configuration?.showContractHotels === true && priceType !== "dynamic") {
                        console.time("total db fetch time");
                        const contractHotelIds = hotels
                            ?.filter((item) => item?.isContractAvailable === true)
                            ?.map((item) => item?._id);

                        // const roomTypes = [];
                        const roomTypes = RoomType.find({
                            hotel: contractHotelIds,
                            isDeleted: false,
                            isActive: true,
                            "roomOccupancies.0": { $exists: true },
                        })
                            .populate("amenities", "name")
                            .cache();

                        const boardTypes = HotelBoardType.find({}).cache();

                        // const allContracts = []
                        const allContracts = HotelContract.find({
                            hotel: contractHotelIds,
                            isDeleted: false,
                            status: "approved",
                            $or: [
                                {
                                    specificNations: true,
                                    applicableNations: nationality?.toUpperCase(),
                                    "applicableNations.0": { $exists: true },
                                },
                                { specificNations: false },
                            ],
                        })
                            .populate("contractGroup")
                            .populate("parentContract", "cancellationPolicies")
                            .cache();

                        const allAddOns = HotelAddOn.find({
                            hotel: contractHotelIds,
                            isDeleted: false,
                        }).cache();

                        const allPromotions = HotelPromotion.find({
                            hotel: contractHotelIds,
                            isDeleted: false,
                            isActive: true,
                            $or: [
                                {
                                    specificNations: true,
                                    applicableNations: nationality?.toUpperCase(),
                                    "applicableNations.0": { $exists: true },
                                },
                                { specificNations: false },
                            ],
                        })
                            .sort({ priority: -1 })
                            .populate({
                                path: "combinedPromotions",
                                options: { sort: { priority: -1 } },
                            })
                            .cache()
                            .lean();

                        const dbResponse = await Promise.all([
                            roomTypes,
                            boardTypes,
                            allContracts,
                            allAddOns,
                            allPromotions,
                        ]);

                        console.timeEnd("total db fetch time");

                        for (let i = 0; i < hotels?.length; i++) {
                            if (hotels[i]?.isContractAvailable === true) {
                                const hotelPromiseReq = getSingleHotelAvailability({
                                    dates,
                                    rooms,
                                    hotel: hotels[i],
                                    noOfNights,
                                    totalAdults,
                                    totalChildren,
                                    fromDate,
                                    toDate,
                                    bookBefore,
                                    reseller: req.reseller,
                                    marketStrategy,
                                    profileMarkup,
                                    clientMarkups,
                                    clientStarCategoryMarkups,
                                    subAgentMarkups,
                                    subAgentStarCategoryMarkups,
                                    nationality,
                                    roomTypes: dbResponse[0],
                                    boardTypes: dbResponse[1],
                                    allContracts: dbResponse[2],
                                    allAddOns: dbResponse[3],
                                    allPromotions: dbResponse[4],
                                    allAllocations: [],
                                    needHashedRate: false,
                                });
                                hotelPromises.push(hotelPromiseReq);
                            }
                        }
                    }
                    const hotelPromiseRes = await Promise.all([...hotelPromises]);

                    // addToJsonNestedFields(body, "OTTILA.RAW_RESPONSE.REQUEST_BODY");

                    // addToJsonNestedFields(hotelPromiseRes, "CONTRACT.RAW_RESPONSE.RESPONSE_DATA");
                    console.timeEnd("contract fetch");
                    return hotelPromiseRes;
                };
                mainPromises.push(getAllHotelsAvailability());

                mainPromises.push(
                    getOttilaHotelsAvailabilityByHCode({
                        fromDate,
                        toDate,
                        rooms,
                        nationality,
                        ottilaHotelCodes,
                        hotelsWithOttilaId,
                        noOfNights,
                        priceType,
                        configuration,
                        resellerId: req.reseller?._id,
                    })
                );

                mainPromises.push(
                    getHotelAvailabilitiesFromIOLX({
                        fromDate,
                        toDate,
                        rooms,
                        nationality: nationality?.toUpperCase(),
                        iolxHotelCodes,
                        hotelsWithIolxId,
                        noOfNights,
                        priceType,
                        configuration,
                    })
                );

                const results = await Promise.all(
                    mainPromises.map((p) => p.catch((error) => error))
                );
                for (let i = 0; i < results.length; i++) {
                    if (results[i] instanceof Error) {
                        console.error(results[i].message); // Handle the error as needed
                    } else {
                        if (i === 0) {
                            hotelBedHotels = results[i]?.hotelBedHotels;
                            hotelBedRowRes = results[i]?.hotelBedRowRes;
                        } else if (i === 1) {
                            hotelPromisesRes = results[i];
                        } else if (i === 2) {
                            ottilaHotels = results[i]?.ottilaHotels;
                        } else if (i === 3) {
                            iolxHotels = results[i]?.iolxHotels;
                        }
                    }
                }

                // addToJsonNestedFields(hotelPromisesRes, "CONTRACT.MAIN_PROMISE_RESPONSE");
                // addToJsonNestedFields(hotelBedHotels, "HOTELBEDS.MAIN_PROMISE_RESPONSE");
                // addToJsonNestedFields(ottilaHotels, "OTTILA.MAIN_PROMISE_RESPONSE");

                console.timeEnd("total fetch time");

                console.time("filter created");

                let filteredHotels = hotelPromisesRes?.filter((item) => {
                    return item?.rooms?.length > 0;
                });

                // const matchedHotelsList = [...filteredHotels];
                // for (let i = 0; i < hotelBedHotels?.length; i++) {
                //     let hotelMatch = false;
                //     for (let j = 0; j < filteredHotels?.length; j++) {
                //         if (
                //             filteredHotels[j].hotel?.hbId &&
                //             hotelBedHotels[i].hotel?.hbId === filteredHotels[j].hotel?.hbId
                //         ) {
                //             if (hotelBedHotels[i]?.minRate < filteredHotels[j]?.minRate) {
                //                 matchedHotelsList[j].minRate = hotelBedHotels[i]?.minRate;
                //                 matchedHotelsList[j].totalOffer = hotelBedHotels[i]?.totalOffer;
                //             }
                //             if (hotelBedHotels[i]?.maxRate > filteredHotels[j]?.maxRate) {
                //                 matchedHotelsList[j].maxRate = hotelBedHotels[i]?.maxRate;
                //             }
                //             hotelMatch = true;
                //             break;
                //         }
                //     }
                //     if (hotelMatch === false) {
                //         matchedHotelsList.push(hotelBedHotels[i]);
                //     }
                // }

                // for (let i = 0; i < ottilaHotels?.length; i++) {
                //     let hotelMatch = false;
                //     for (let j = 0; j < matchedHotelsList?.length; j++) {
                //         if (
                //             matchedHotelsList[j].hotel?.ottilaId &&
                //             ottilaHotels[i].hotel?.ottilaId === matchedHotelsList[j].hotel?.ottilaId
                //         ) {
                //             if (ottilaHotels[i]?.minRate < matchedHotelsList[j]?.minRate) {
                //                 matchedHotelsList[j].minRate = ottilaHotels[i]?.minRate;
                //                 matchedHotelsList[j].totalOffer = ottilaHotels[i]?.totalOffer;
                //             }
                //             if (ottilaHotels[i]?.maxRate > matchedHotelsList[j]?.maxRate) {
                //                 matchedHotelsList[j].maxRate = ottilaHotels[i]?.maxRate;
                //             }
                //             hotelMatch = true;
                //             break;
                //         }
                //     }
                //     if (hotelMatch === false) {
                //         matchedHotelsList.push(ottilaHotels[i]);
                //     }
                // }

                // addToJsonNestedFields(matchedHotelsList, "MATCHED_HOTEL_LIST");

                function mapHotels(...hotelLists) {
                    const updatedHotelsList = [];

                    for (const hotels of hotelLists) {
                        for (const hotel of hotels) {
                            if (hotel.hotel._id.toString() === "64a2a20682251e398f2b6633") {
                                console.log("64a2a20682251e398f2b6633");
                            }
                            let hotelMatch = false;

                            for (let j = 0; j < updatedHotelsList.length; j++) {
                                if (
                                    updatedHotelsList[j].hotel &&
                                    hotel.hotel &&
                                    ((updatedHotelsList[j].hotel.hbId &&
                                        hotel.hotel.hbId &&
                                        updatedHotelsList[j].hotel.hbId === hotel.hotel.hbId) ||
                                        (updatedHotelsList[j].hotel.ottilaId &&
                                            hotel.hotel.ottilaId &&
                                            updatedHotelsList[j].hotel.ottilaId ===
                                                hotel.hotel.ottilaId))
                                ) {
                                    if (hotel.minRate < updatedHotelsList[j].minRate) {
                                        updatedHotelsList[j].minRate = hotel.minRate;
                                        updatedHotelsList[j].totalOffer = hotel.totalOffer;
                                    }
                                    if (hotel.maxRate > updatedHotelsList[j].maxRate) {
                                        updatedHotelsList[j].maxRate = hotel.maxRate;
                                    }
                                    hotelMatch = true;
                                    break;
                                }
                            }

                            if (!hotelMatch) {
                                updatedHotelsList.push(hotel);
                            }
                        }
                    }

                    return updatedHotelsList;
                }

                // Usage:
                const matchedHotelsList = mapHotels(
                    filteredHotels,
                    hotelBedHotels,
                    ottilaHotels,
                    iolxHotels
                );

                // for (let i = 0; i < ottilaHotels?.length; i++) {
                //     let hotelMatch = false;
                //     for (let j = 0; j < matchedHotelsList?.length; j++) {
                //         if (
                //             matchedHotelsList[j].hotel?.ottilaId &&
                //             ottilaHotels[i].hotel?.ottilaId === matchedHotelsList[j].hotel?.ottilaId
                //         ) {
                //             if (ottilaHotels[i]?.minRate < matchedHotelsList[j]?.minRate) {
                //                 matchedHotelsList[j].minRate = ottilaHotels[i]?.minRate;
                //                 matchedHotelsList[j].totalOffer = ottilaHotels[i]?.totalOffer;
                //             }
                //             hotelMatch = true;
                //             break;
                //         }
                //     }
                //     if (hotelMatch === false) {
                //         matchedHotelsList.push(ottilaHotels[i]);
                //     }
                // }

                const searchFilters = {
                    starCategories: [
                        { starCategory: "1", total: 0 },
                        { starCategory: "2", total: 0 },
                        { starCategory: "3", total: 0 },
                        { starCategory: "4", total: 0 },
                        { starCategory: "5", total: 0 },
                        { starCategory: "apartment", total: 0 },
                    ],
                    minPrice: 0,
                    maxPrice: 0,
                    accommodationTypes: [],
                    hotelChains: [],
                    boardTypes: [],
                    amenities: [],
                    // discountTypes: [],
                    hotelGroups: [],
                };

                for (let k = 0; k < matchedHotelsList?.length; k++) {
                    if (matchedHotelsList[k].hotel?.starCategory === "1") {
                        searchFilters.starCategories[0].total += 1;
                    } else if (matchedHotelsList[k].hotel?.starCategory === "2") {
                        searchFilters.starCategories[1].total += 1;
                    } else if (matchedHotelsList[k].hotel?.starCategory === "3") {
                        searchFilters.starCategories[2].total += 1;
                    } else if (matchedHotelsList[k].hotel?.starCategory === "4") {
                        searchFilters.starCategories[3].total += 1;
                    } else if (matchedHotelsList[k].hotel?.starCategory === "5") {
                        searchFilters.starCategories[4].total += 1;
                    } else if (matchedHotelsList[k].hotel?.starCategory === "apartment") {
                        searchFilters.starCategories[5].total += 1;
                    }

                    if (k === 0) {
                        searchFilters.minPrice = matchedHotelsList[k]?.minRate;
                    }
                    if (searchFilters.minPrice > matchedHotelsList[k]?.minRate) {
                        searchFilters.minPrice = matchedHotelsList[k]?.minRate;
                    }
                    if (searchFilters.maxPrice < matchedHotelsList[k]?.minRate) {
                        searchFilters.maxPrice = matchedHotelsList[k]?.minRate;
                    }

                    if (matchedHotelsList[k]?.hotel.accommodationType) {
                        const objIndex = searchFilters.accommodationTypes.findIndex((item) => {
                            return (
                                item?.code ===
                                matchedHotelsList[k]?.hotel.accommodationType?.accommodationTypeCode
                            );
                        });
                        if (objIndex !== -1) {
                            searchFilters.accommodationTypes[objIndex].total += 1;
                        } else {
                            searchFilters.accommodationTypes.push({
                                code: matchedHotelsList[k]?.hotel.accommodationType
                                    ?.accommodationTypeCode,
                                name: matchedHotelsList[k]?.hotel.accommodationType
                                    ?.accommodationTypeName,
                                total: 1,
                            });
                        }
                    }

                    if (matchedHotelsList[k]?.hotel.hotelChain) {
                        const objIndex = searchFilters.hotelChains.findIndex((item) => {
                            return (
                                item?._id?.toString() ===
                                matchedHotelsList[k]?.hotel.hotelChain?._id?.toString()
                            );
                        });
                        if (objIndex !== -1) {
                            searchFilters.hotelChains[objIndex].total += 1;
                        } else {
                            searchFilters.hotelChains.push({
                                _id: matchedHotelsList[k]?.hotel.hotelChain?._id,
                                name: matchedHotelsList[k]?.hotel.hotelChain?.chainName,
                                total: 1,
                            });
                        }
                    }

                    // if (matchedHotelsList[k]?.hotel.hotelGroup) {
                    //     const objIndex = searchFilters.hotelGroups.findIndex((item) => {
                    //         return (
                    //             item?._id?.toString() ===
                    //             matchedHotelsList[k]?.hotel.hotelGroup?._id?.toString()
                    //         );
                    //     });
                    //     if (objIndex !== -1) {
                    //         searchFilters.hotelGroups[objIndex].total += 1;
                    //     } else {
                    //         searchFilters.hotelGroups.push({
                    //             _id: matchedHotelsList[k]?.hotel.hotelGroup?._id,
                    //             name: matchedHotelsList[k]?.hotel.hotelGroup?.groupName,
                    //             total: 1,
                    //         });
                    //     }
                    // }

                    if (matchedHotelsList[k]?.hotel.featuredAmenities?.length > 0) {
                        for (
                            let l = 0;
                            l < matchedHotelsList[k]?.hotel.featuredAmenities?.length;
                            l++
                        ) {
                            const featuredAmenity =
                                matchedHotelsList[k]?.hotel.featuredAmenities[l];
                            const objIndex = searchFilters.amenities.findIndex((item) => {
                                return item?._id === featuredAmenity?._id;
                            });
                            if (objIndex !== -1) {
                                searchFilters.amenities[objIndex].total += 1;
                            } else {
                                searchFilters.amenities.push({
                                    _id: featuredAmenity?._id,
                                    name: featuredAmenity?.name,
                                    total: 1,
                                });
                            }
                        }
                    }

                    if (matchedHotelsList[k]?.hotel.boardTypes?.length > 0) {
                        for (let l = 0; l < matchedHotelsList[k]?.hotel.boardTypes?.length; l++) {
                            const boardType = matchedHotelsList[k]?.hotel.boardTypes[l];
                            const objIndex = searchFilters.boardTypes.findIndex((item) => {
                                return item?.boardShortName === boardType?.boardShortName;
                            });
                            if (objIndex !== -1) {
                                searchFilters.boardTypes[objIndex].total += 1;
                            } else {
                                searchFilters.boardTypes.push({
                                    boardShortName: boardType?.boardShortName,
                                    name: boardType?.boardName,
                                    total: 1,
                                });
                            }
                        }
                    }
                }

                searchFilters.accommodationTypes = searchFilters.accommodationTypes.sort(
                    (a, b) => b.total - a.total
                );
                searchFilters.hotelChains = searchFilters.hotelChains.sort(
                    (a, b) => b.total - a.total
                );
                searchFilters.hotelGroups = searchFilters.hotelGroups.sort(
                    (a, b) => b.total - a.total
                );
                searchFilters.amenities = searchFilters.amenities.sort((a, b) => b.total - a.total);
                searchFilters.boardTypes = searchFilters.boardTypes.sort(
                    (a, b) => b.total - a.total
                );

                const hotelAvailSearchResult = await HotelAvailSearchResult.create({
                    filters: searchFilters,
                    totalHotels: matchedHotelsList?.length,
                    expiresIn: new Date(new Date().setMinutes(new Date().getMinutes() + 15)),
                    fromDate,
                    toDate,
                    rooms,
                    hotels: [],
                    processTime: 0,
                    // hotelBedRowRes,
                    resellerId: req.reseller?._id,
                });
                hotelAvailSearchResult.hotels = matchedHotelsList;
                hotelAvailSearchResult.save();

                searchResult = [...matchedHotelsList];
                returnSearchId = hotelAvailSearchResult?._id;
                returnFilters = searchFilters;
                totalHotels = matchedHotelsList?.length;

                console.timeEnd("filter created");
            }

            console.time("filtered");

            const sortedArr = searchResult;
            if (sortBy === "price:desc") {
                sortedArr.sort((a, b) => b?.minRate - a?.minRate);
            } else {
                sortedArr.sort((a, b) => a?.minRate - b?.minRate);
            }

            const parsedChains = chains ? JSON.parse(chains) : [];
            const parsedHotelGroups = hotelGroups ? JSON.parse(hotelGroups) : [];
            const parsedAccommodationTypes = accommodationTypes
                ? JSON.parse(accommodationTypes)
                : [];
            const parsedStarCategories = starCategories ? JSON.parse(starCategories) : [];
            const parsedBoardTypes = boardTypes ? JSON.parse(boardTypes) : [];
            const parsedAmenities = amenities ? JSON.parse(amenities) : [];

            // addToJsonNestedFields(sortedArr, "SORTED_ARRAY");

            const filteredHotels = sortedArr.filter((item) => {
                return (
                    (priceFrom ? item?.minRate >= Number(priceFrom) : true) &&
                    (priceTo ? item?.minRate <= Number(priceTo) : true) &&
                    (parsedStarCategories?.length > 0
                        ? parsedStarCategories?.some(
                              (stCategory) =>
                                  stCategory?.toString() === item?.hotel?.starCategory?.toString()
                          )
                        : true) &&
                    (parsedAccommodationTypes?.length > 0
                        ? parsedAccommodationTypes?.some(
                              (accType) =>
                                  accType === item?.hotel?.accommodationType?.accommodationTypeCode
                          )
                        : true) &&
                    (parsedChains?.length > 0
                        ? parsedChains?.some(
                              (chain) =>
                                  chain?.toString() === item?.hotel?.hotelChain?._id?.toString()
                          )
                        : true) &&
                    (parsedHotelGroups?.length > 0
                        ? parsedHotelGroups?.some(
                              (group) =>
                                  group?.toString() === item?.hotel?.hotelGroup?._id?.toString()
                          )
                        : true) &&
                    (parsedBoardTypes?.length > 0
                        ? parsedBoardTypes?.some((boardType) =>
                              item?.hotel?.boardTypes?.some(
                                  (brdType) => brdType?.boardShortName === boardType
                              )
                          )
                        : true) &&
                    (parsedAmenities?.length > 0
                        ? parsedAmenities?.some((amenity) =>
                              item?.hotel?.featuredAmenities?.some(
                                  (tempAmenity) =>
                                      tempAmenity?._id?.toString() === amenity?.toString()
                              )
                          )
                        : true)
                );
            });

            const slicedHotelArr = filteredHotels.slice(
                Number(skip) * Number(limit),
                Number(skip) * Number(limit) + Number(limit)
            );

            // addToJsonNestedFields(slicedHotelArr, "FORMAT_AVAILABILITY_BEFORE");

            const formatedAvailability = slicedHotelArr?.map((item) => {
                let image = item?.hotel?.images ? item?.hotel?.images[0] : [];
                delete item?.hotel?.roomTypes;
                // delete item?.hotel?.images;
                delete item?.hotel?.boardTypes;
                delete item?.hotel?.amenities;
                delete item?.rooms;

                return { ...item, hotel: { ...item?.hotel, image } };
            });

            console.timeEnd("filtered");

            // addToJsonNestedFields(formatedAvailability, "FORMAT_AVAILABILITY_AFTER");

            res.status(200).json({
                searchId: returnSearchId,
                totalHotels,
                filteredHotelsCount: filteredHotels?.length || 0,
                skip: Number(skip),
                limit: Number(limit),
                filters: returnFilters,
                sortBy: sortBy || "",
                appliedFilters: {
                    priceFrom: priceFrom || "",
                    priceTo: priceTo || "",
                    starCategories: parsedStarCategories || [],
                    accommodationTypes: parsedAccommodationTypes || [],
                    chains: parsedChains || [],
                    hotelGroups: parsedHotelGroups || [],
                    amenities: parsedAmenities || [],
                    boardTypes: parsedBoardTypes || [],
                },
                hotels: formatedAvailability,
                fromDate,
                toDate,
                roomPaxes: rooms,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelDetails: async (req, res) => {
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
            })
                .populate("country", "countryName")
                .populate("state", "stateName")
                .populate("city", "cityName")
                .populate("accommodationType")
                .populate("amenities.amenity amenities.amenityGroup")
                .populate("featuredAmenities.amenity")
                .lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            hotel.featuredAmenities = hotel?.amenities
                ?.filter((item) => {
                    return item?.isFeatured === true && item?.amenity?.name;
                })
                ?.map((item) => {
                    return {
                        _id: item?._id,
                        name: item?.amenity?.name,
                        icon: item?.amenity?.icon,
                    };
                });
            let amenities = [];
            for (let i = 0; i < hotel?.amenities?.length; i++) {
                let amenity = hotel?.amenities[i];
                if (amenity?.amenity?.name && amenity?.amenityGroup?.name) {
                    const groupObjIndex = amenities?.findIndex((item) => {
                        return item?._id?.toString() === amenity?.amenityGroup?._id?.toString();
                    });
                    if (groupObjIndex !== -1) {
                        amenities[groupObjIndex]?.subAmenities?.push({
                            name: amenity?.amenity?.name,
                            icon: amenity?.amenity?.icon,
                            isPaid: amenity?.isPaid,
                        });
                    } else {
                        amenities.push({
                            _id: amenity?.amenityGroup?._id,
                            amenity: {
                                name: amenity?.amenityGroup?.name,
                                icon: amenity?.amenityGroup?.icon,
                            },
                            subAmenities: [
                                {
                                    name: amenity?.amenity?.name,
                                    icon: amenity?.amenity?.icon,
                                    isPaid: amenity?.isPaid,
                                },
                            ],
                        });
                    }
                }
            }
            hotel.amenities = amenities;

            res.status(200).json(hotel);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelAvailability: async (req, res) => {
        try {
            const { fromDate, toDate, rooms, nationality, hotelId, priceType } = req.body;

            const { _, error } = singleHotelAvailabilitySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const dates = getDates(fromDate, toDate);
            if (
                new Date(fromDate) >= new Date(toDate) ||
                new Date(fromDate) < new Date(new Date().setHours(0, 0, 0, 0))
            ) {
                return sendErrorResponse(
                    res,
                    400,
                    "invalid dates. please select a valid checkin and checkout dates"
                );
            }
            const noOfNights = dates.length - 1;

            const filters = {
                _id: Types.ObjectId(hotelId),
                isDeleted: false,
                isActive: true,
                isPublished: true,
            };

            let hotels = await Hotel.find(filters)
                .populate("boardTypes")
                .select(
                    "hotelName boardTypes isApiConnected hbId isContractAvailable openDays starCategory area city ottilaId iolxId"
                )
                .lean();
            if (!hotels || hotels?.length < 1) {
                return sendErrorResponse(res, 404, "hotel not found");
            }
            let hotel = hotels[0];

            let availableHotels = [];
            let availableCities = [];
            let availableAreas = [];
            const b2bHotelResellerSettings = await B2BHotelResellerSettings.findOne({
                resellerId:
                    req.reseller?.role === "reseller"
                        ? req.reseller?._id
                        : req.reseller?.referredBy,
            }).lean();
            if (b2bHotelResellerSettings) {
                availableHotels = b2bHotelResellerSettings.availableHotels || [];
                availableCities = b2bHotelResellerSettings.availableCities || [];
                availableAreas = b2bHotelResellerSettings.availableAreas || [];
            }

            if (
                (availableHotels?.length > 0 &&
                    !availableHotels?.some(
                        (item) => item?.toString() === hotel?._id?.toString()
                    )) ||
                (availableCities?.length > 0 &&
                    !availableCities?.some(
                        (item) => item?.toString() === hotel?.city?.toString()
                    )) ||
                (availableAreas?.length > 0 &&
                    !availableAreas?.some((item) => item?.toString() === hotel?.area?.toString()))
            ) {
                return sendErrorResponse(res, 400, "hotel is not available at this moment");
            }

            const date1 = new Date();
            const date2 = new Date(fromDate);
            const diffTime = Math.abs(date2 - date1);
            const bookBefore = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const totalAdults = rooms?.reduce((a, b) => a + b?.noOfAdults, 0);
            const totalChildren = rooms?.reduce((a, b) => a + b?.noOfChildren, 0);

            if (nationality && nationality !== "") {
                const nationalityDetail = await Country.findOne({
                    isocode: nationality?.toUpperCase(),
                });
                if (!nationalityDetail) {
                    return sendErrorResponse(res, 400, "invalid nationality code");
                }
            }

            let marketStrategy;
            if (req.reseller.role === "reseller") {
                marketStrategy = await MarketStrategy.findOne({
                    _id: req.reseller?.marketStrategy,
                });
            } else {
                const mainAgent = await Reseller.findById({
                    _id: req.reseller?.referredBy,
                })
                    .select("marketStrategy")
                    .lean();
                marketStrategy = await MarketStrategy.findOne({
                    _id: mainAgent?.marketStrategy,
                });
            }

            let profileMarkup;
            if (req.reseller.role === "reseller") {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller?._id,
                });
            } else {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller?.referredBy,
                });
            }

            // code is not used!
            let apiOccupanciesArr = [
                {
                    rooms: rooms?.length,
                    adults: 0,
                    children: 0,
                    paxes: [],
                },
            ];
            rooms?.forEach((item) => {
                apiOccupanciesArr[0].adults += Number(item?.noOfAdults) || 0;
                apiOccupanciesArr[0].children += Number(item?.noOfChildren) || 0;
                if (Number(item?.noOfChildren) > 0) {
                    apiOccupanciesArr[0].paxes.push(
                        ...item?.childrenAges?.map((age) => {
                            return {
                                type: "CH",
                                age,
                            };
                        })
                    );
                }
            });

            const clientMarkups = await B2BClientHotelMarkup.find({
                resellerId: req.reseller?._id,
                hotelId,
            }).lean();
            const clientStarCategoryMarkups = await B2BClientStarCategoryMarkup.find({
                resellerId: req.reseller?._id,
                name: hotel?.starCategory,
            }).lean();

            let subAgentMarkups;
            let subAgentStarCategoryMarkups;
            if (req.reseller?.role === "sub-agent") {
                subAgentMarkups = await B2bSubAgentHotelMarkup.find({
                    resellerId: req.reseller?._id,
                    hotelId,
                });
                subAgentStarCategoryMarkups = await B2BSubAgentStarCategoryMarkup.find({
                    resellerId: req.reseller?._id,
                    name: hotel?.starCategory,
                }).lean();
            }

            const apiHotelIds = [];
            const apiHotelCodes = [];
            const ottilaHotelCodes = [];
            const iolxHotelCodes = [];
            const hotelsWithHbId = {};
            const hotelsWithOttilaId = {};
            const hotelsWithIolxId = {};
            for (let hotel of hotels) {
                if (hotel.isApiConnected === false) {
                    continue;
                }
                if (hotel?.hbId) {
                    apiHotelCodes.push(hotel?.hbId);
                    apiHotelIds.push(hotel?._id);
                    hotelsWithHbId[hotel?.hbId] = hotel;
                }
                if (hotel?.ottilaId) {
                    ottilaHotelCodes.push(hotel?.ottilaId);
                    hotelsWithOttilaId[hotel?.ottilaId] = hotel;
                }
                if (hotel?.iolxId) {
                    iolxHotelCodes.push(hotel?.iolxId);
                    hotelsWithIolxId[hotel?.iolxId] = hotel;
                }
            }

            // TODO:
            // cache this fetching to increase performance
            const configuration = await B2BGlobalConfiguration.findOne({
                settingsNumber: 1,
            }).lean();

            let mainPromises = [];
            let hotelBedHotels = [];
            let ottilaHotels = [];
            let iolxHotels = [];
            let hotelBedRowRes;
            let hotelPromisesRes = [];
            mainPromises.push(
                getSingleHotelBedAvailability({
                    fromDate,
                    toDate,
                    rooms,
                    nationality,
                    apiHotelCodes,
                    hotelsWithHbId,
                    noOfNights,
                    clientMarkups,
                    clientStarCategoryMarkups,
                    subAgentMarkups,
                    subAgentStarCategoryMarkups,
                    reseller: req.reseller,
                    configuration,
                    marketStrategy,
                    profileMarkup,
                    apiHotelIds,
                    priceType,
                })
            );

            mainPromises.push(
                getSingleOttilaHotelAvailability({
                    fromDate,
                    toDate,
                    rooms,
                    nationality,
                    ottilaHotelCodes,
                    hotelsWithOttilaId,
                    noOfNights,
                    clientMarkups,
                    clientStarCategoryMarkups,
                    subAgentMarkups,
                    subAgentStarCategoryMarkups,
                    reseller: req.reseller,
                    configuration,
                    marketStrategy,
                    profileMarkup,
                    apiHotelIds,
                    priceType,
                    resellerId: req.reseller?._id,
                })
            );

            console.log("fetching contract");
            // fetching from contract
            const getAllHotelsAvailability = async () => {
                const hotelPromises = [];
                if (configuration?.showContractHotels === true && priceType !== "dynamic") {
                    console.time("total db fetch time");
                    const contractHotelIds = hotels
                        ?.filter((item) => item?.isContractAvailable === true)
                        ?.map((item) => item?._id);

                    const roomTypes = RoomType.find({
                        isDeleted: false,
                        hotel: contractHotelIds,
                        isActive: true,
                        "roomOccupancies.0": { $exists: true },
                    })
                        .populate("amenities", "name")
                        .lean();

                    const boardTypes = HotelBoardType.find({}).lean();

                    const allContracts = HotelContract.find({
                        hotel: contractHotelIds,
                        isDeleted: false,
                        status: "approved",
                        $and: [
                            {
                                $or: [
                                    {
                                        specificNations: true,
                                        applicableNations: nationality?.toUpperCase(),
                                        "applicableNations.0": { $exists: true },
                                    },
                                    { specificNations: false },
                                ],
                            },
                            {
                                $or: [
                                    {
                                        isSpecialRate: true,
                                        bookingWindowFrom: { $lte: new Date() },
                                        bookingWindowTo: { $gte: new Date() },
                                    },
                                    { isSpecialRate: false },
                                ],
                            },
                        ],
                    })
                        .populate("contractGroup")
                        .populate("parentContract", "cancellationPolicies")
                        .lean();

                    const allAddOns = HotelAddOn.find({
                        hotel: contractHotelIds,
                        isDeleted: false,
                    }).lean();

                    const allPromotions = HotelPromotion.find({
                        hotel: contractHotelIds,
                        bookingWindowFrom: { $lte: new Date(new Date().setHours(0, 0, 0, 0)) },
                        bookingWindowTo: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                        isDeleted: false,
                        isActive: true,
                        $or: [
                            {
                                specificNations: true,
                                applicableNations: nationality?.toUpperCase(),
                                "applicableNations.0": { $exists: true },
                            },
                            { specificNations: false },
                        ],
                    })
                        .populate({
                            path: "combinedPromotions",
                            options: { sort: { priority: -1 } },
                        })
                        .sort({ priority: -1 })
                        .lean();

                    const allAllocations = HotelAllocation.find({
                        $and: [
                            { date: { $gte: new Date(fromDate) } },
                            { date: { $lte: new Date(toDate) } },
                        ],
                        hotel: contractHotelIds,
                    }).lean();

                    const dbResponse = await Promise.all([
                        roomTypes,
                        boardTypes,
                        allContracts,
                        allAddOns,
                        allPromotions,
                        allAllocations,
                    ]);

                    for (let i = 0; i < hotels?.length; i++) {
                        if (hotels[i]?.isContractAvailable === true) {
                            const hotelPromiseReq = getSingleHotelAvailability({
                                dates,
                                rooms,
                                hotel: hotels[i],
                                noOfNights,
                                totalAdults,
                                totalChildren,
                                fromDate,
                                toDate,
                                bookBefore,
                                reseller: req.reseller,
                                marketStrategy,
                                profileMarkup,
                                clientMarkups,
                                clientStarCategoryMarkups,
                                subAgentMarkups,
                                subAgentStarCategoryMarkups,
                                nationality,
                                roomTypes: dbResponse[0],
                                boardTypes: dbResponse[1],
                                allContracts: dbResponse[2],
                                allAddOns: dbResponse[3],
                                allPromotions: dbResponse[4],
                                allAllocations: dbResponse[5],
                            });
                            hotelPromises.push(hotelPromiseReq);
                        }
                    }
                }

                return await Promise.all([...hotelPromises]);
            };
            mainPromises.push(getAllHotelsAvailability());

            mainPromises.push(
                getRoomsAvailabilityFromIOLX({
                    fromDate,
                    toDate,
                    rooms,
                    nationality,
                    iolxHotelCodes,
                    hotelsWithIolxId,
                    noOfNights,
                    clientMarkups,
                    clientStarCategoryMarkups,
                    subAgentMarkups,
                    subAgentStarCategoryMarkups,
                    reseller: req.reseller,
                    configuration,
                    marketStrategy,
                    profileMarkup,
                    apiHotelIds,
                    priceType,
                })
            );

            const results = await Promise.all(mainPromises.map((p) => p.catch((error) => error)));
            for (let i = 0; i < results.length; i++) {
                if (results[i] instanceof Error) {
                    console.error("Error", results[i].message); // Handle the error as needed
                } else {
                    if (i === 0) {
                        hotelBedHotels = results[i]?.hotelBedHotels || [];
                        // hotelBedRowRes = results[i]?.hotelBedRowRes;
                    } else if (i === 1) {
                        ottilaHotels = results[i]?.ottilaHotels || [];
                    } else if (i === 2) {
                        hotelPromisesRes = results[i] || [];
                    } else if (i === 3) {
                        iolxHotels = results[i]?.iolxHotels;
                    }
                }
            }

            let filteredHotels = hotelPromisesRes?.filter((item) => {
                return item?.rooms?.length > 0;
            });

            const roomRates = [];

            const mergedRooms = [
                ...((hotelBedHotels[0] && hotelBedHotels[0]?.rooms) || []),
                ...((ottilaHotels[0] && ottilaHotels[0]?.rooms) || []),
                // ...((iolxHotels[0] && iolxHotels[0]?.rooms) || []),

                // Need to pass currency type on contract & need to register contract as provider in vervotech
                // ...((filteredHotels[0] && filteredHotels[0].rooms) || []),
            ];

            const getUniqueRates = (rates) => {
                const uniqueRates = {};
                rates.forEach((rate) => {
                    const existingRate = uniqueRates[rate.boardName];
                    if (!existingRate || existingRate.netPrice > rate.netPrice) {
                        uniqueRates[rate.boardName] = rate;
                    }
                });
                return Object.values(uniqueRates);
            };

            // Filter duplicate rates within each object of mergedRooms
            const filteredRates = mergedRooms.map((item) => ({
                ...item,
                rates: getUniqueRates(item.rates),
            }));

            const individualRatesArray = filteredRates.flatMap((item) =>
                item.rates.map((rate) => ({
                    ...item,
                    rates: rate,
                }))
            );

            individualRatesArray.forEach((room, index) => {
                roomRates.push({
                    index,
                    code: room?.code,
                    roomName: room?.roomName,
                    provider: room?.provider,
                    providerHotelId: room?.providerHotelId,
                    currency: room?.currency,
                    boardBasis: room.rates?.boardName,
                });
            });

            const vervotechResponse = await getVervotechMatchedHotelRooms(roomRates);

            if (!vervotechResponse.success) console.error(vervotechResponse);

            const boardTypes = await HotelBoardType.find();

            const VroomsRes = [];
            vervotechResponse?.standardRooms?.forEach((Vrooms) => {
                const rates = {};
                const result = {
                    roomTypeId: null,
                    roomType: null,
                    code: "",
                    roomName: "",
                    standardName: Vrooms.standardName,
                };
                const rateBoards = {};

                Vrooms.mappedRoomRates.map((rate) => {
                    const res = individualRatesArray.filter(
                        (room, index) => index === rate.inputIndex
                    )[0];

                    let boardName;
                    const boardBasis =
                        rate.boardBasis.toLowerCase() !== "unknown"
                            ? rate.boardBasis.toLowerCase()
                            : res.boardBasis?.toLowerCase();
                    if (boardBasis) {
                        boardName = boardTypes.find(
                            (type) =>
                                type.boardName === boardBasis || type.subNames.includes(boardBasis)
                        )?.boardName;

                        rate.boardBasis = boardName || boardBasis;
                        rateBoards[rate.boardBasis] = {
                            count: (rateBoards[rate.boardBasis]?.count || 0) + 1,
                            indexes: [
                                ...(rateBoards[rate.boardBasis]?.indexes || []),
                                rate.inputIndex,
                            ],
                        };
                    }

                    let vervoTechInfo = {
                        roomName: res?.roomName,
                        amenities: [],
                        areaInM2: null,
                        images: [
                            // common image for rooms if the doesn't have any room images
                            {
                                path: "https://api.travellerschoice.ae/public/images/room-types/images-1683725216266-642918009.jpg",
                            },
                        ],
                        serviceBy: "",
                    };

                    rate?.attributes?.forEach((attribute) => {
                        if (attribute && attribute.key && attribute.value) {
                            if (attribute.key === "RoomSize") {
                                const parts = attribute?.value?.split(" ");
                                if (parts.length === 2) {
                                    vervoTechInfo.areaInM2 = convertSqftToSqMeter(parts[0]);
                                }
                            }
                        }
                    });
                    result.code = result.code || res.code;
                    result.roomTypeId = result.roomTypeId || res.roomTypeId;
                    result.roomType = result.roomType || res.roomType || vervoTechInfo;
                    result.roomName = result.roomName || res.roomName;
                    rates[rate.inputIndex] = {
                        ...res.rates,
                        boardName: rate.boardBasis,
                    };
                });

                for (let boardType in rateBoards) {
                    const value = rateBoards[boardType];

                    let minRateIdx = -1;
                    let currRate;
                    if (value.count && value.count > 1) {
                        value.indexes.forEach((idx, index) => {
                            const roomPrice = rates[idx].netPrice;
                            if (index === 0 || roomPrice < currRate) {
                                currRate = roomPrice;
                                minRateIdx = idx;
                            }
                        });
                        if (minRateIdx !== -1 && currRate) {
                            rateBoards[boardType].minRateIdx = minRateIdx;
                        }
                    }
                }

                for (let boardType in rateBoards) {
                    const minRateIdx = rateBoards[boardType]?.minRateIdx;
                    if (minRateIdx !== undefined && minRateIdx !== -1) {
                        const indexesToDelete = rateBoards[boardType].indexes.filter(
                            (index) => index !== minRateIdx
                        );
                        indexesToDelete.forEach((key) => {
                            delete rates[key];
                        });
                    }
                }
                result.rates = Object.values(rates);
                VroomsRes.push(result);
            });

            if (filteredHotels[0] && filteredHotels[0].rooms && filteredHotels[0].rooms?.length) {
                VroomsRes.push(...filteredHotels[0]?.rooms);
            }

            if (iolxHotels[0] && iolxHotels[0].rooms && iolxHotels[0].rooms?.length) {
                VroomsRes.push(...iolxHotels[0]?.rooms);
            }

            const availableDetails = getFallbackData([
                filteredHotels,
                hotelBedHotels,
                ottilaHotels,
                iolxHotels,
            ]);

            function getFallbackData(dataSources) {
                for (const dataSource of dataSources) {
                    if (dataSource.length > 0) {
                        return dataSource[0];
                    }
                }
                return {};
            }

            function getLowestMinAndOfferRate(rates) {
                const lowestMinRate = Math.min(...rates.map((rate) => rate.minRate));
                const offerRate =
                    rates.find((rate) => rate.minRate === lowestMinRate)?.totalOffer || 0;

                return { lowestMinRate, offerRate };
            }

            function getHighestMaxRate(rates) {
                return Math.max(...rates.map((rate) => rate.maxRate));
            }

            const allRates = [filteredHotels, hotelBedHotels, ottilaHotels, iolxHotels].map(
                (providerRes) => ({
                    minRate: providerRes[0]?.minRate || 0,
                    maxRate: providerRes[0]?.maxRate || 0,
                    totalOffer: providerRes[0]?.totalOffer || 0,
                })
            );

            const { lowestMinRate, offerRate } = getLowestMinAndOfferRate(allRates);
            const highestMaxRate = getHighestMaxRate(allRates);

            // Sort the rates arrays within each object
            VroomsRes.forEach((obj) => {
                obj.rates.sort((a, b) => a.netPrice - b.netPrice);
            });

            // Sort the main array based on the first element of the sorted rates arrays
            VroomsRes.sort((a, b) => {
                // Compare the first elements of the sorted rates arrays
                return a.rates[0].netPrice - b.rates[0].netPrice;
            });

            const matchedHotelsList = [
                {
                    ...availableDetails,
                    rooms: VroomsRes,
                    minRate: lowestMinRate,
                    maxRate: highestMaxRate,
                    totalOffer: offerRate,
                },
            ];

            // const matchedHotelsList = [...filteredHotels];

            // for (let i = 0; i < hotelBedHotels?.length; i++) {
            //     let hotelMatch = false;
            //     for (let j = 0; j < filteredHotels?.length; j++) {
            //         if (
            //             filteredHotels[j].hotel?.hbId &&
            //             hotelBedHotels[i]?.hotel?.hbId?.toString() ===
            //                 filteredHotels[j]?.hotel?.hbId?.toString()
            //         ) {
            //             for (let k = 0; k < hotelBedHotels[i]?.rooms?.length; k++) {
            //                 let roomMatch = false;
            //                 for (let l = 0; l < filteredHotels[j]?.rooms?.length; l++) {
            //                     if (
            //                         filteredHotels[j]?.rooms[l]?.roomTypeId?.toString() ===
            //                         hotelBedHotels[i]?.rooms[k]?.roomTypeId?.toString()
            //                     ) {
            //                         matchedHotelsList[j].rooms[l].rates?.push(
            //                             ...hotelBedHotels[i]?.rooms[k]?.rates
            //                         );
            //                         roomMatch = true;
            //                         break;
            //                     }
            //                 }
            //                 if (roomMatch === false) {
            //                     matchedHotelsList[j].rooms.push(hotelBedHotels[i]?.rooms[k]);
            //                 }
            //             }
            //             if (hotelBedHotels[i]?.minRate < filteredHotels[j]?.minRate) {
            //                 matchedHotelsList[j].minRate = hotelBedHotels[i]?.minRate;
            //                 matchedHotelsList[j].totalOffer = hotelBedHotels[i]?.totalOffer;
            //             }
            //             if (hotelBedHotels[i]?.maxRate > filteredHotels[j]?.maxRate) {
            //                 matchedHotelsList[j].maxRate = hotelBedHotels[i]?.maxRate;
            //             }
            //             hotelMatch = true;
            //             break;
            //         }
            //     }
            //     if (hotelMatch === false) {
            //         matchedHotelsList.push(hotelBedHotels[i]);
            //     }
            // }

            // const roomRates = [];

            // matchedHotelsList[0].rooms.forEach((room, index) => {
            //     roomRates.push({
            //         index,
            //         code: room?.code,
            //         roomName: room?.name || room?.roomType?.roomName,
            //         description: room?.description || room?.roomType?.description,
            //         provider: room.provider || "HotelBeds",
            //         providerHotelId: room.providerHotelId ||  matchedHotelsList[0].hotel.hbId,
            //         currency: room.currency || matchedHotelsList[0].hotel.currency,
            //     });
            // });

            // return res.json({roomRates})

            function deleteRateKeyRaw(rooms) {
                if (Array.isArray(rooms)) {
                    rooms.forEach((room) => {
                        if (room.rates) {
                            room.rates.forEach((rate) => {
                                delete rate.rateKeyRaw;
                                delete rate?.rateInfo;
                            });
                        }
                    });
                }
            }

            const searchResult = new HotelAvailSearchResult({
                filters: [],
                totalHotels: matchedHotelsList?.length || 0,
                expiresIn: new Date(new Date().setMinutes(new Date().getMinutes() + 15)),
                fromDate,
                toDate,
                rooms,
                hotels: matchedHotelsList || [],
                processTime: 0,
                // hotelBedRowRes,
                nationality,
                resellerId: req.reseller?._id,
            });
            await searchResult.save();

            // Call the function on rooms of the first hotel
            deleteRateKeyRaw(searchResult.hotels[0].rooms);

            res.status(200).json({
                searchId: searchResult?._id,
                expiresIn:
                    (new Date(searchResult?.expiresIn).getTime() - new Date().getTime()) / 1000,
                fromDate: searchResult.fromDate,
                toDate: searchResult.toDate,
                noOfNights: noOfNights,
                roomPaxes: searchResult.rooms,
                hotel: hotel,
                rooms: (searchResult.hotels ? searchResult.hotels[0]?.rooms : []) || [],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleRoomRateWithDetails: async (req, res) => {
        try {
            const { hotelId, searchId } = req.body;
            let { rateKey } = req.body;

            createHotelLog({
                stepNumber: 1001,
                actionUrl: "",
                request: req.body,
                response: "",
                processId: searchId,
                userId: req.reseller?._id,
            });

            const { _, error } = singleRoomRateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(searchId)) {
                return sendErrorResponse(res, 400, "invalid search id");
            }
            const searchResult = await HotelAvailSearchResult.findOne({
                _id: searchId,
                resellerId: req.reseller?._id,
            }).lean();
            if (!searchResult) {
                return sendErrorResponse(
                    res,
                    404,
                    "search result not found. please search availability again"
                );
            }

            if (new Date(searchResult.expiresIn).getTime() < new Date().getTime()) {
                return res.status(400).json({
                    errorCode: "EXPIRIED",
                    message: "sorry search result expired, please search availability again",
                    hotelId,
                    fromDate: searchResult.fromDate,
                    toDate: searchResult.toDate,
                    rooms: searchResult.rooms,
                    nationality: searchResult.nationality || "",
                });
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid room type id");
            }
            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
                isPublished: true,
                isActive: true,
            })
                .populate("country", "countryName")
                .populate("state", "stateName")
                .populate("city", "cityName")
                .populate("amenities.amenity")
                .populate("accommodationType")
                .lean();
            if (!hotel) {
                return sendErrorResponse(
                    res,
                    404,
                    "hotel not found, please search availability again"
                );
            }

            hotel.featuredAmenities = hotel?.amenities
                ?.filter((item) => {
                    return item?.isFeatured === true && item?.amenity?.name;
                })
                ?.map((item) => {
                    if (item?.isFeatured === true) {
                        return {
                            _id: item?._id,
                            name: item?.amenity?.name,
                            icon: item?.amenity?.icon,
                        };
                    }
                });

            let matchedRate;
            let matchedRoomType;
            let matchedHotel;
            for (let i = 0; i < searchResult?.hotels?.length; i++) {
                const hotel = searchResult?.hotels[i];
                if (hotel?.hotel?._id?.toString() === hotelId?.toString()) {
                    matchedHotel = hotel;
                    for (let j = 0; j < hotel?.rooms?.length; j++) {
                        for (let k = 0; k < hotel?.rooms[j]?.rates?.length; k++) {
                            const rate = hotel?.rooms[j]?.rates[k];
                            if (rate?.rateKey === rateKey) {
                                rateKey = rate?.rateKeyRaw;
                                matchedRate = rate;
                                matchedRoomType = hotel?.rooms[j];
                                break;
                            }
                        }
                    }
                    break;
                }
            }
            if (!matchedRoomType || !matchedRate || !matchedHotel) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry rateKey not found, please search availability again"
                );
            }

            const hotelProviderId = matchedRate?.detailsKey?.split("|")[0];

            const providerDetails = await B2BHotelProvider.findOne({ _id: hotelProviderId });

            if (!providerDetails) return sendErrorResponse(res, 404, "Provider details not found");

            let roomTypeModel;

            switch (providerDetails.name) {
                case HOTEL_PROVIDERS.CONTRACT:
                    roomTypeModel = RoomType;
                    break;

                case HOTEL_PROVIDERS.HOTELBEDS:
                    roomTypeModel = HotelBedRoomType;
                    break;

                case HOTEL_PROVIDERS.OTTILA:
                    roomTypeModel = OttilaRoomType;
                    break;

                default:
                    roomTypeModel = RoomType;
                    break;
            }

            let roomType = matchedRoomType?.roomType;

            if (providerDetails.configurations.hasRoomTypeAvailable) {
                roomType = await roomTypeModel.findOne({
                    _id: matchedRoomType?.roomTypeId,
                    isDeleted: false,
                    isActive: true,
                });
                if (!roomType) {
                    return sendErrorResponse(
                        res,
                        400,
                        "room type not found, please search availability again"
                    );
                }
            }

            const travellerDetails = [];
            let roomCount = 1;
            for (let room of searchResult.rooms) {
                if (
                    hotel.allGuestDetailsRequired ||
                    providerDetails.configurations?.allGuestDetailsRequired
                ) {
                    console.log(room);
                    for (let i = 0; i < Array.from({ length: room?.noOfAdults }).length; i++) {
                        travellerDetails.push({
                            roomId: roomCount,
                            type: `Adult ${i + 1}`,
                            ageRequired: providerDetails.configurations.ageRequired,
                            genderRequired: providerDetails.configurations.genderRequired,
                        });
                    }
                    for (let i = 0; i < Array.from({ length: room?.noOfChildren }).length; i++) {
                        travellerDetails.push({
                            roomId: roomCount,
                            type: `Child ${i + 1}`,
                            ageRequired: providerDetails.configurations.ageRequired,
                            genderRequired: providerDetails.configurations.genderRequired,
                        });
                    }
                } else {
                    travellerDetails.push({
                        roomId: roomCount,
                        type: `Adult ${roomCount}`,
                        ageRequired: providerDetails.configurations.ageRequired,
                        genderRequired: providerDetails.configurations.genderRequired,
                    });
                }

                roomCount += 1;
            }

            console.log("travellerDetails", travellerDetails);

            const allowedPaymentMethods = ["wallet", "ccavenue", "pay-later"];

            if (providerDetails.name === HOTEL_PROVIDERS.OTTILA) {
                allowedPaymentMethods.splice(1, 2);
            } else if (providerDetails.name === HOTEL_PROVIDERS.IOLX) {
                allowedPaymentMethods.splice(1, 2);
            }

            let responseData;
            if (
                matchedRate?.isApiConnected === true &&
                providerDetails.name === HOTEL_PROVIDERS.HOTELBEDS
            ) {
                const hotelBedRate = await getSingleHotelBedRate({
                    rateKey,
                    searchId,
                    resellerId: req.reseller?._id,
                });
                const rate = hotelBedRate?.rooms[0]?.rates[0];

                if (
                    !hotelBedRate ||
                    !hotelBedRate?.rooms ||
                    hotelBedRate?.rooms?.length < 1 ||
                    !rate
                ) {
                    return sendErrorResponse(res, 404, "sorry, hotel rate not found");
                }

                if (rateKey !== matchedRate?.rateKeyRaw) {
                    return sendErrorResponse(res, 400, "rateKey mismatch!");
                }

                let netPriceAED = Number(rate?.net);
                let priceWithMarkup = netPriceAED;

                let marketStrategy;
                if (req.reseller.role === "reseller") {
                    marketStrategy = await MarketStrategy.findOne({
                        _id: req.reseller?.marketStrategy,
                    });
                } else {
                    const mainAgent = await Reseller.findById({
                        _id: req.reseller?.referredBy,
                    })
                        .select("marketStrategy")
                        .lean();
                    marketStrategy = await MarketStrategy.findOne({
                        _id: mainAgent?.marketStrategy,
                    });
                }

                let marketMarkup;
                if (marketStrategy) {
                    for (let mi = 0; mi < marketStrategy?.hotel?.length; mi++) {
                        if (
                            marketStrategy?.hotel[mi]?.hotelId?.toString() ===
                            hotel?._id?.toString()
                        ) {
                            for (
                                let mj = 0;
                                mj < marketStrategy?.hotel[mi]?.roomTypes?.length;
                                mj++
                            ) {
                                let tempRmType = marketStrategy?.hotel[mi]?.roomTypes[mj];
                                if (
                                    tempRmType?.roomTypeId?.toString() ===
                                        matchedRoomType?.roomTypeId?.toString() &&
                                    tempRmType?.hotelProviderId?.toString() === hotelProviderId &&
                                    tempRmType?.markup !== 0
                                ) {
                                    marketMarkup = tempRmType;
                                    break;
                                }
                            }

                            break;
                        }
                    }
                    if (!marketMarkup) {
                        for (let mi = 0; mi < marketStrategy?.starCategory?.length; mi++) {
                            if (marketStrategy?.starCategory[mi]?.name === hotel?.starCategory) {
                                marketMarkup = marketStrategy?.starCategory[mi];
                                break;
                            }
                        }
                    }
                }

                let profileMarkup;
                if (req.reseller.role === "reseller") {
                    profileMarkup = await B2BMarkupProfile.findOne({
                        resellerId: req.reseller?._id,
                    });
                } else {
                    profileMarkup = await B2BMarkupProfile.findOne({
                        resellerId: req.reseller?.referredBy,
                    });
                }

                let b2bMarkup;
                if (profileMarkup) {
                    for (let mi = 0; mi < profileMarkup?.hotel?.length; mi++) {
                        if (
                            profileMarkup?.hotel[mi]?.hotelId?.toString() === hotel?._id?.toString()
                        ) {
                            for (
                                let mj = 0;
                                mj < profileMarkup?.hotel[mi]?.roomTypes?.length;
                                mj++
                            ) {
                                let tempRmType = profileMarkup?.hotel[mi]?.roomTypes[mj];
                                if (
                                    tempRmType?.roomTypeId?.toString() ===
                                        roomType?._id?.toString() &&
                                    tempRmType?.hotelProviderId?.toString() === hotelProviderId &&
                                    tempRmType?.markup !== 0
                                ) {
                                    b2bMarkup = tempRmType;
                                    break;
                                }
                            }

                            break;
                        }
                    }
                    if (!b2bMarkup) {
                        for (let mi = 0; mi < profileMarkup?.starCategory?.length; mi++) {
                            if (profileMarkup?.starCategory[mi]?.name === hotel?.starCategory) {
                                b2bMarkup = profileMarkup?.starCategory[mi];
                                break;
                            }
                        }
                    }
                }

                let clientMarkup = await B2BClientHotelMarkup.findOne({
                    roomTypeId: roomType?._id,
                    resellerId: req.reseller?._id,
                });
                if (!clientMarkup) {
                    clientMarkup = await B2BClientStarCategoryMarkup.findOne({
                        resellerId: req.reseller?._id,
                        name: hotel?.starCategory,
                    });
                }
                let subAgentMarkup;
                if (req.reseller?.role === "sub-agent") {
                    subAgentMarkup = await B2bSubAgentHotelMarkup.findOne({
                        roomTypeId: roomType._id,
                        resellerId: req.reseller?._id,
                    });
                    if (!subAgentMarkup) {
                        subAgentMarkup = await B2BSubAgentStarCategoryMarkup.findOne({
                            resellerId: req.reseller?._id,
                            name: hotel?.starCategory,
                        }).lean();
                    }
                }

                let adminMarketMarkup = 0;
                if (marketMarkup && !isNaN(marketMarkup.markup)) {
                    if (marketMarkup.markupType === "flat") {
                        adminMarketMarkup = marketMarkup.markup * matchedHotel.noOfNights;
                    } else {
                        adminMarketMarkup = (priceWithMarkup / 100) * marketMarkup.markup;
                    }
                }
                priceWithMarkup += adminMarketMarkup;

                let adminB2bMarkup = 0;
                if (b2bMarkup && !isNaN(b2bMarkup?.markup)) {
                    if (b2bMarkup.markupType === "flat") {
                        adminB2bMarkup = b2bMarkup.markup * matchedHotel.noOfNights;
                    } else {
                        adminB2bMarkup = (priceWithMarkup / 100) * b2bMarkup.markup;
                    }
                }
                priceWithMarkup += adminB2bMarkup;

                let saMarkup = 0;
                if (subAgentMarkup && !isNaN(subAgentMarkup.markup)) {
                    if (subAgentMarkup.markupType === "flat") {
                        saMarkup = subAgentMarkup.markup * matchedHotel.noOfNights;
                    } else {
                        saMarkup = (priceWithMarkup / 100) * subAgentMarkup.markup;
                    }
                }
                priceWithMarkup += saMarkup;

                let clMarkup = 0;
                if (clientMarkup && !isNaN(clientMarkup.markup)) {
                    if (clientMarkup.markupType === "flat") {
                        clMarkup = clientMarkup.markup * matchedHotel.noOfNights;
                    } else {
                        clMarkup = (priceWithMarkup / 100) * clientMarkup.markup;
                    }
                }
                priceWithMarkup += clMarkup;

                const totalOffer = rate?.offers?.reduce((a, b) => a + Math.abs(b?.amount), 0) || 0;

                console.log("adminMarketMarkup", adminMarketMarkup);

                responseData = {
                    searchId,
                    expiresIn:
                        (new Date(searchResult?.expiresIn).getTime() - new Date().getTime()) / 1000,
                    fromDate: searchResult?.fromDate,
                    toDate: searchResult?.toDate,
                    noOfNights: matchedHotel?.noOfNights,
                    roomPaxes: searchResult?.rooms,
                    travellerDetails,
                    hotel: {
                        _id: hotel?._id,
                        hotelName: hotel?.hotelName,
                        address: hotel?.address,
                        country: hotel?.country,
                        state: hotel?.state,
                        website: hotel?.website,
                        starCategory: hotel?.starCategory,
                        image: hotel?.images[0],
                        featuredAmenities: hotel?.featuredAmenities,
                        city: hotel?.city,
                        accommodationType: hotel?.accommodationType,
                    },
                    roomType: {
                        _id: roomType?._id,
                        roomName: roomType?.roomName,
                        serviceBy: roomType?.serviceBy,
                        areaInM2: roomType?.areaInM2,
                        images: roomType?.images,
                        description: roomType?.description,
                    },
                    rate: {
                        // rateKey: rate?.rateKey,
                        rateKey: matchedRate.rateKey,
                        rateName: roomType?.roomName + " with " + rate?.boardName?.toLowerCase(),
                        boardCode: rate?.boardCode,
                        boardName: rate?.boardName?.toLowerCase(),
                        selectedRoomOccupancies: matchedRate?.selectedRoomOccupancies,
                        roomPrice: netPriceAED,
                        netPrice: priceWithMarkup,
                        grossPrice: priceWithMarkup + totalOffer,
                        addOnsTxt: [],
                        promotions:
                            rate?.promotions?.map((item) => {
                                return item.name;
                            }) || [],
                        availableAllocation: rate?.allotment,
                        cancellationPolicies: rate?.cancellationPolicies?.map((item) => {
                            return `If you cancel this booking from ${item?.from} you will be charged ${item?.amount} AED.`;
                        }),
                        totalOffer,
                        rateComments: [rate?.rateComments] || [],
                        markup: {
                            adminMarketMarkup,
                            adminB2bMarkup, // admin markup for b2b
                            subAgentMarkup: saMarkup, // markup for subagents from agent
                            clientMarkup: clMarkup, // markup for client
                        },
                        isApiConnected: true,
                    },
                    allowedPaymentMethods,
                };
            } else {
                delete matchedRate?.rateKeyRaw;

                if (providerDetails.name === HOTEL_PROVIDERS.OTTILA) {
                    let updatedRateInfo;

                    const rateInfo = matchedRate?.rateInfo;

                    if (!rateInfo) {
                        return sendErrorResponse(res, 400, "Invalid rate info!");
                    }
                    updatedRateInfo = { ...matchedRate?.rateInfo };

                    try {
                        const preBookInfo = await createOttilaPreBooking(
                            rateInfo,
                            rateKey,
                            "",
                            req.reseller?._id
                        );
                        if (Math.floor(preBookInfo.Amount) !== Math.floor(matchedRate?.roomPrice)) {
                            return sendErrorResponse(res, 400, "Rate amount has been changed!");
                        }
                        if (!preBookInfo.Available) {
                            return sendErrorResponse(res, 404, "Room is not available!");
                        }
                        updatedRateInfo.policies = preBookInfo?.Policies;
                        updatedRateInfo.amount = preBookInfo?.Amount;
                        updatedRateInfo.actions = updatedRateInfo.actions.map((action) => {
                            if (action.type === "v2-res") {
                                return {
                                    ...action,
                                    rateKey: rateKey,
                                };
                            }
                            return action;
                        });
                        updatedRateInfo?.actions?.push({
                            type: "pre-booking",
                            tokenId: preBookInfo?.TokenId,
                            hKey: preBookInfo?.HKey,
                        });
                        const updatedRooms = updatedRateInfo.roomDetail.map((rm) => ({
                            ...rm,
                            RateKey:
                                preBookInfo?.RoomDetails.find(
                                    (rm2) => rm.RoomSrNo.toString() === rm2.RoomSrNo
                                )?.RateKey || "",
                        }));
                        updatedRateInfo.roomDetail = updatedRooms;
                        const policies = preBookInfo?.Policies || [];

                        matchedRate.cancellationPolicies = policies.flatMap(
                            (policy) =>
                                policy.CancellationPolicy?.map(
                                    (plcy) =>
                                        `From ${plcy?.FromDate} to ${plcy?.ToDate} the cancellation charge amount will be ${plcy?.Amount}.`
                                ) || []
                        );

                        function stripHtmlTags(html) {
                            return html.replace(/<\/?[^>]+(>|$)/g, "");
                        }

                        matchedRate.rateComments = policies.map((policy) =>
                            stripHtmlTags(policy.Remark)
                        );

                        await OttilaRoomRateInfo.findOneAndUpdate(
                            { rateKey: rateKey, resellerId: req?.reseller?._id }, // Filter condition
                            {
                                $set: {
                                    roomCategory: updatedRateInfo?.roomCategory,
                                    cityId: updatedRateInfo?.cityId,
                                    nationalityId: updatedRateInfo?.nationalityId,
                                    checkInDate: updatedRateInfo?.checkInDate,
                                    checkOutDate: updatedRateInfo?.checkOutDate,
                                    hCode: updatedRateInfo?.hCode,
                                    actions: updatedRateInfo?.actions,
                                    policies: updatedRateInfo?.policies,
                                    amount: updatedRateInfo?.amount,
                                    roomDetail: updatedRateInfo?.roomDetail,
                                    rateKey: rateKey,
                                    resellerId: req?.reseller?._id,
                                    packageRate: matchedRate?.detailsKey?.split("|")[3],
                                },
                            },
                            { upsert: true, new: true, useFindAndModify: false } // Options
                        );

                        delete matchedRate?.rateInfo;
                    } catch (error) {
                        console.error(error);
                        return sendErrorResponse(res, 400, error);
                    }
                }

                responseData = {
                    searchId,
                    expiresIn:
                        (new Date(searchResult?.expiresIn).getTime() - new Date().getTime()) / 1000,
                    fromDate: searchResult?.fromDate,
                    toDate: searchResult?.toDate,
                    noOfNights: matchedHotel?.noOfNights,
                    roomPaxes: searchResult?.rooms,
                    travellerDetails,
                    hotel: {
                        _id: hotel?._id,
                        hotelName: hotel?.hotelName,
                        address: hotel?.address,
                        country: hotel?.country,
                        state: hotel?.state,
                        website: hotel?.website,
                        starCategory: hotel?.starCategory,
                        image: hotel?.images[0],
                        featuredAmenities: hotel?.featuredAmenities,
                        city: hotel?.city,
                        accommodationType: hotel?.accommodationType,
                    },
                    roomType: {
                        _id: roomType?._id,
                        roomName: roomType?.roomName,
                        serviceBy: roomType?.serviceBy,
                        areaInM2: roomType?.areaInM2,
                        images: roomType?.images,
                        description: roomType?.description,
                    },
                    rate: matchedRate,
                    allowedPaymentMethods,
                };
            }

            createHotelLog({
                stepNumber: 1004,
                actionUrl: "",
                request: "",
                response: responseData,
                processId: searchId,
                userId: req.reseller?._id,
            });

            res.status(200).json(responseData);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
