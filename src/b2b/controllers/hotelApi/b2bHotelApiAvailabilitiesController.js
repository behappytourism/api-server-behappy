const { isValidObjectId, Types } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const {
    HotelAvailSearchResult,
    Hotel,
    RoomType,
    HotelAllocation,
    HotelBoardType,
    HotelContract,
    HotelAddOn,
    HotelPromotion,
} = require("../../../models/hotel");
const { Country } = require("../../../models");
const MarketStrategy = require("../../../admin/models/marketStrategy.model");
const { Reseller, B2BMarkupProfile, B2bSubAgentHotelMarkup } = require("../../models");
const B2BClientHotelMarkup = require("../../models/hotel/b2bClientHotelMarkup.model");
const {
    B2BClientStarCategoryMarkup,
    B2BSubAgentStarCategoryMarkup,
    B2BHotelResellerSettings,
} = require("../../models/hotel");
const {
    hotelAvailabilitySchema,
    singleHotelAvailabilitySchema,
} = require("../../validations/hotel/hotelAvailability.schema");
const { getDates } = require("../../../utils");
const B2bClientHotelMarkup = require("../../models/hotel/b2bClientHotelMarkup.model");
const B2BGlobalConfiguration = require("../../../admin/models/b2bGlobalConfiguration.model");
const {
    getAllHotelsHbAvailability,
    getSingleHotelBedAvailability,
} = require("../../helpers/hotel/hotelBedAvailabilityHelpers");
const { getSingleHotelAvailability } = require("../../helpers/hotel/hotelAvailabilityHelpers");

module.exports = {
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

                if (availResult) {
                    searchResult = [...availResult?.hotels];
                    returnFilters = availResult?.filters;
                    totalHotels = availResult.totalHotels;
                }
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
                        })
                        .lean();
                }

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

                const apiHotels = hotels?.filter((hotel) => {
                    return (
                        hotel?.hbId !== null && hotel.isApiConnected === true && !isNaN(hotel?.hbId)
                    );
                });
                const apiHotelCodes = apiHotels.map((item) => item?.hbId);

                const hotelsWithHbId = {};
                hotels?.forEach((item) => {
                    hotelsWithHbId[item?.hbId] = item;
                });

                // TODO:
                // cache this fetching to increase performance
                const configuration = await B2BGlobalConfiguration.findOne({
                    settingsNumber: 1,
                }).lean();

                // console.timeEnd("other db time");

                console.time("total fetch time");

                let mainPromises = [];
                let hotelBedHotels = [];
                let hotelBedRowRes;
                let hotelPromisesRes = [];
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
                    const hotelPromises = [];
                    if (configuration?.showContractHotels === true && priceType !== "dynamic") {
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

                        // console.timeEnd("total db fetch time");

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
                                });
                                hotelPromises.push(hotelPromiseReq);
                            }
                        }
                    }
                    const hotelPromiseRes = await Promise.all([...hotelPromises]);
                    // console.timeEnd("contract fetch");
                    return hotelPromiseRes;
                };
                mainPromises.push(getAllHotelsAvailability());

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
                        }
                    }
                }

                let filteredHotels = hotelPromisesRes?.filter((item) => {
                    return item?.rooms?.length > 0;
                });

                const matchedHotelsList = [...filteredHotels];
                for (let i = 0; i < hotelBedHotels?.length; i++) {
                    let hotelMatch = false;
                    for (let j = 0; j < filteredHotels?.length; j++) {
                        if (
                            filteredHotels[j].hotel?.hbId &&
                            hotelBedHotels[i].hotel?.hbId === filteredHotels[j].hotel?.hbId
                        ) {
                            if (hotelBedHotels[i]?.minRate < filteredHotels[j]?.minRate) {
                                matchedHotelsList[j].minRate = hotelBedHotels[i]?.minRate;
                                matchedHotelsList[j].totalOffer = hotelBedHotels[i]?.totalOffer;
                            }
                            if (hotelBedHotels[i]?.maxRate > filteredHotels[j]?.maxRate) {
                                matchedHotelsList[j].maxRate = hotelBedHotels[i]?.maxRate;
                            }
                            hotelMatch = true;
                            break;
                        }
                    }
                    if (hotelMatch === false) {
                        matchedHotelsList.push(hotelBedHotels[i]);
                    }
                }

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
            }

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

            const formatedAvailability = filteredHotels?.map((item) => {
                let image = item?.hotel?.images ? item?.hotel?.images[0] : [];
                delete item?.hotel?.roomTypes;
                // delete item?.hotel?.images;
                delete item?.hotel?.boardTypes;
                delete item?.hotel?.amenities;
                delete item?.rooms;

                return { ...item, hotel: { ...item?.hotel, image } };
            });

            res.status(200).json({
                searchId: returnSearchId,
                // totalHotels,
                // filteredHotelsCount: filteredHotels?.length || 0,
                // filters: returnFilters,
                // sortBy: sortBy || "",
                // appliedFilters: {
                //     priceFrom: priceFrom || "",
                //     priceTo: priceTo || "",
                //     starCategories: parsedStarCategories || [],
                //     accommodationTypes: parsedAccommodationTypes || [],
                //     chains: parsedChains || [],
                //     hotelGroups: parsedHotelGroups || [],
                //     amenities: parsedAmenities || [],
                //     boardTypes: parsedBoardTypes || [],
                // },
                hotels: formatedAvailability,
                fromDate,
                toDate,
                roomPaxes: rooms,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getHotelSingleDetails: async (req, res) => {
        try {
            const { hotelId } = req.params;

            if (!isValidObjectId(hotelId)) return sendErrorResponse(res, 400, "invalid hotel id");

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

            if (!hotel) return sendErrorResponse(res, 400, "hotel not found");

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

    searchSingleHotelAvailability: async (req, res) => {
        try {
            const { fromDate, toDate, rooms, nationality, hotelId, priceType } = req.body;

            const { _, error } = singleHotelAvailabilitySchema.validate(req.body);

            if (error) return sendErrorResponse(res, 400, error.details[0].message);

            if (!isValidObjectId(hotelId)) return sendErrorResponse(res, 400, "invalid hotel id");

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
                    "hotelName boardTypes isApiConnected hbId isContractAvailable openDays starCategory area city"
                )
                .lean();

            if (!hotels || hotels?.length < 1)
                return sendErrorResponse(res, 400, "hotel not found");

            let hotel = hotels[0];

            let availableHotels = [];
            let availableCities = [];
            let availableAreas = [];
            const b2bHotelResellerSettings = await B2BHotelResellerSettings.findOne({
                reseller:
                    req.reseller?.role === "reseller"
                        ? req.reseller?._id
                        : req.reseller?.referredBy,
            }).lean();

            if (b2bHotelResellerSettings) {
                availableHotels = b2bHotelResellerSettings.availableHotels || [];
                availableCities = b2bHotelResellerSettings.availableCities || [];
                availableAreas = b2bHotelResellerSettings.availableAreas || [];
            }

            console.log(availableHotels);

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

            const apiHotels = hotels?.filter((hotel) => {
                return hotel?.hbId !== null && hotel.isApiConnected === true && !isNaN(hotel?.hbId);
            });
            const apiHotelCodes = apiHotels.map((item) => item?.hbId);
            const apiHotelIds = apiHotels.map((item) => item?._id);

            const hotelsWithHbId = {};
            hotels?.forEach((item) => {
                hotelsWithHbId[item?.hbId] = item;
            });

            // TODO:
            // cache this fetching to increase performance
            const configuration = await B2BGlobalConfiguration.findOne({
                settingsNumber: 1,
            }).lean();

            let mainPromises = [];
            let hotelBedHotels = [];
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

            console.log("fetching contract");
            // fetching from contract
            const getAllHotelsAvailability = async () => {
                const hotelPromises = [];
                if (configuration?.showContractHotels === true && priceType !== "dynamic") {
                    // console.time("total db fetch time");
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
                        $or: [
                            {
                                specificNations: true,
                                applicableNations: nationality?.toUpperCase(),
                                "applicableNations.0": { $exists: true },
                            },
                            { specificNations: false },
                        ],
                        $or: [
                            {
                                isSpecialRate: true,
                                bookingWindowFrom: { $lte: new Date() },
                                bookingWindowTo: { $gte: new Date() },
                            },
                            { isSpecialRate: false },
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

            const results = await Promise.all(mainPromises.map((p) => p.catch((error) => error)));
            for (let i = 0; i < results.length; i++) {
                if (results[i] instanceof Error) {
                    console.error("Error", results[i].message); // Handle the error as needed
                } else {
                    if (i === 0) {
                        hotelBedHotels = results[i]?.hotelBedHotels;
                        hotelBedRowRes = results[i]?.hotelBedRowRes;
                    } else if (i === 1) {
                        hotelPromisesRes = results[i];
                    }
                }
            }

            let filteredHotels = hotelPromisesRes?.filter((item) => {
                return item?.rooms?.length > 0;
            });

            const matchedHotelsList = [...filteredHotels];
            for (let i = 0; i < hotelBedHotels?.length; i++) {
                let hotelMatch = false;
                for (let j = 0; j < filteredHotels?.length; j++) {
                    if (
                        filteredHotels[j].hotel?.hbId &&
                        hotelBedHotels[i]?.hotel?.hbId?.toString() ===
                            filteredHotels[j]?.hotel?.hbId?.toString()
                    ) {
                        for (let k = 0; k < hotelBedHotels[i]?.rooms?.length; k++) {
                            let roomMatch = false;
                            for (let l = 0; l < filteredHotels[j]?.rooms?.length; l++) {
                                if (
                                    filteredHotels[j]?.rooms[l]?.roomTypeId?.toString() ===
                                    hotelBedHotels[i]?.rooms[k]?.roomTypeId?.toString()
                                ) {
                                    matchedHotelsList[j].rooms[l].rates?.push(
                                        ...hotelBedHotels[i]?.rooms[k]?.rates
                                    );
                                    roomMatch = true;
                                    break;
                                }
                            }
                            if (roomMatch === false) {
                                matchedHotelsList[j].rooms.push(hotelBedHotels[i]?.rooms[k]);
                            }
                        }
                        if (hotelBedHotels[i]?.minRate < filteredHotels[j]?.minRate) {
                            matchedHotelsList[j].minRate = hotelBedHotels[i]?.minRate;
                            matchedHotelsList[j].totalOffer = hotelBedHotels[i]?.totalOffer;
                        }
                        if (hotelBedHotels[i]?.maxRate > filteredHotels[j]?.maxRate) {
                            matchedHotelsList[j].maxRate = hotelBedHotels[i]?.maxRate;
                        }
                        hotelMatch = true;
                        break;
                    }
                }
                if (hotelMatch === false) {
                    matchedHotelsList.push(hotelBedHotels[i]);
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
};
