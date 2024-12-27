const { isValidObjectId } = require("mongoose");

const { singleRoomTypeRate } = require("../../../b2b/helpers/quotation");
const {
    getSingleHotelAvailabilityQtn,
} = require("../../../b2b/helpers/quotation/quotationHotelHelper");
const {
    singleRoomTypeRateSchema,
    qtnHotelAvailabilitySchema,
} = require("../../../b2b/validations/quoatation/b2bHotelQuotation.schema");
const { sendErrorResponse } = require("../../../helpers");
const { State, City, Area } = require("../../../models/global");
const {
    Hotel,
    RoomType,
    HotelBoardType,
    HotelContract,
    HotelAddOn,
    HotelAllocation,
} = require("../../../models/hotel");
const { getDates } = require("../../../utils");
const hotelAndRoomTypesWithEmptyRate = require("../../helpers/quotation/hotelAndRoomTypeWithEmptyRate");

module.exports = {
    getQtnHotelsList: async (req, res) => {
        try {
            const { searchQuery } = req.body;

            const filters = {
                isPublished: true,
                isDeleted: false,
                isActive: true,
            };

            if (!isValidObjectId(searchQuery.id)) {
                return sendErrorResponse(res, 400, "invalid search id");
            }

            if (searchQuery.suggestionType === "CITY") {
                filters.city = searchQuery.id;
            } else if (searchQuery.suggestionType === "AREA") {
                filters.area = searchQuery.id;
            } else if (searchQuery.suggestionType === "STATE") {
                filters.state = searchQuery.id;
            } else if (searchQuery.suggestionType === "HOTEL") {
                filters._id = searchQuery.id;
            } else {
                return sendErrorResponse(res, 500, "invalid search query");
            }

            const hotels = await Hotel.find(filters, { images: { $slice: 1 } })
                .populate({ path: "country", select: "countryName" })
                .populate({ path: "state", select: "stateName" })
                .populate({ path: "city", select: "cityName" })
                .populate({ path: "area", select: "areaName" })
                .select("_id hotelName country state city starCategory")
                .sort({ hotelName: 1 })
                // .collation({ locale: "en", caseLevel: true })
                .lean();

            const mappedHotels = hotels?.map((item) => {
                return { ...item, image: item?.images ? item?.images[0] : null };
            });

            res.status(200).json(mappedHotels);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSearchSuggestions: async (req, res) => {
        try {
            const { search } = req.query;

            if (!search || search?.length < 3) {
                return sendErrorResponse(res, 400, "invalid search. atleast 3 characters required");
            }

            let promises = [];

            promises.push(
                (async () => {
                    const states = await State.find({
                        isDeleted: false,
                        stateName: { $regex: search, $options: "i" },
                    }).lean();

                    const cities = await City.find({
                        isDeleted: false,
                        $or: [{ cityName: { $regex: search, $options: "i" } }, { state: states }],
                    })
                        .populate("propertyCount")
                        .populate("country", "countryName")
                        .populate("state", "stateName")
                        .lean();

                    return cities
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
                    const areas = await Area.find({
                        isDeleted: false,
                        areaName: { $regex: search, $options: "i" },
                    })
                        .populate("propertyCount")
                        .populate("country", "countryName")
                        .populate("state", "stateName")
                        .populate("city", "cityName")
                        .lean();

                    return areas
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

            promises.push(
                (async () => {
                    const hotels = await Hotel.find({
                        hotelName: { $regex: search, $options: "i" },
                        isDeleted: false,
                        isActive: true,
                        isPublished: true,
                        isContractAvailable: true,
                    })
                        .limit(5)
                        .populate("country", "countryName")
                        .populate("state", "stateName")
                        .populate("city", "cityName")
                        .select("hotelName country, city state")
                        .lean();

                    return hotels?.map((item) => {
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
                })()
            );

            const response = await Promise.all(promises);

            res.status(200).json({ cities: response[0], areas: response[1], hotels: response[2] });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getHotelSearchSuggestions: async (req, res) => {
        try {
            const { search } = req.query;

            if (!search || search?.length < 3) {
                return sendErrorResponse(res, 400, "invalid search. atleast 3 characters required");
            }

            const hotels = await Hotel.aggregate([
                {
                    $match: {
                        hotelName: { $regex: search, $options: "i" },
                        isDeleted: false,
                        isActive: true,
                        isPublished: true,
                        isContractAvailable: true,
                    },
                },
                {
                    $lookup: {
                        from: "countries",
                        localField: "country",
                        foreignField: "_id",
                        as: "country",
                        pipeline: [{ $match: { isDeleted: false } }],
                    },
                },
                {
                    $lookup: {
                        from: "states",
                        localField: "state",
                        foreignField: "_id",
                        as: "state",
                        pipeline: [{ $match: { isDeleted: false } }],
                    },
                },
                {
                    $lookup: {
                        from: "cities",
                        localField: "city",
                        foreignField: "_id",
                        as: "city",
                        pipeline: [{ $match: { isDeleted: false } }],
                    },
                },
                {
                    $set: {
                        country: { $arrayElemAt: ["$country", 0] },
                        state: { $arrayElemAt: ["$state", 0] },
                        city: { $arrayElemAt: ["$city", 0] },
                    },
                },
                {
                    $project: {
                        suggestionType: "HOTEL",
                        countryName: "$country.countryName",
                        stateName: "$state.stateName",
                        cityName: "$city.cityName",
                        hotelName: 1,
                        hotelId: "$_id",
                        clickable: true,
                        childSuggestions: [],
                    },
                },
            ]);

            res.status(200).json({ hotels });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllHotelsWithRoomTypes: async (req, res) => {
        try {
            const hotels = await Hotel.find({
                isPublished: true,
                isDeleted: false,
                isActive: true,
                isContractAvailable: true,
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
                .select("_id hotelName country state city starCategory roomTypes boardTypes")
                .sort({ hotelName: 1 })
                // .collation({ locale: "en", caseLevel: true })
                .lean();

            res.status(200).json(hotels);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleRoomTypeRate: async (req, res) => {
        try {
            const {
                noOfAdults,
                noOfChildren,
                childrenAges,
                checkInDate,
                checkOutDate,
                hotelId,
                roomTypeId,
                boardTypeCode,
                isTourismFeeIncluded,
            } = req.body;

            const { error } = singleRoomTypeRateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const details = await singleRoomTypeRate(
                noOfAdults,
                noOfChildren,
                childrenAges,
                checkInDate,
                checkOutDate,
                hotelId,
                roomTypeId,
                boardTypeCode,
                isTourismFeeIncluded
            );

            res.status(200).json(details);
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    getQtnHotelAvailability: async (req, res) => {
        try {
            const { fromDate, toDate, searchQuery, rooms } = req.body;
            const { skip = 0, limit = 10, sortBy } = req.query;

            const { _, error } = qtnHotelAvailabilitySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const filters = {
                isDeleted: false,
                isPublished: true,
                isActive: true,
                isContractAvailable: true,
            };

            if (!isValidObjectId(searchQuery.id)) {
                return sendErrorResponse(res, 400, "invalid search id");
            }

            if (searchQuery.suggestionType === "CITY") {
                filters.city = searchQuery.id;
            } else if (searchQuery.suggestionType === "AREA") {
                filters.area = searchQuery.id;
            } else if (searchQuery.suggestionType === "STATE") {
                filters.state = searchQuery.id;
            } else if (searchQuery.suggestionType === "HOTEL") {
                filters._id = searchQuery.id;
            } else {
                return sendErrorResponse(res, 500, "invalid search query");
            }

            const dates = getDates(fromDate, toDate);
            if (
                new Date(fromDate) >= new Date(toDate) ||
                new Date(fromDate) < new Date(new Date().setHours(0, 0, 0, 0))
            ) {
                return sendErrorResponse(res, 400, "invalid dates. Please select a valid dates");
            }
            const noOfNights = dates.length - 1;

            const hotels = await Hotel.find(filters, { images: { $slice: 1 } })
                .populate("country", "countryName")
                .populate("state", "stateName")
                .populate("city", "cityName")
                .populate("area", "areaName")
                .populate("accommodationType")
                .select({
                    _id: 1,
                    hotelName: 1,
                    address: 1,
                    starCategory: 1,
                    openDays: 1,
                    distanceFromCity: 1,
                    country: 1,
                    state: 1,
                    city: 1,
                    isContractAvailable: 1,
                    boardTypes: 1,
                    accommodationType: 1,
                })
                .lean();

            if (hotels?.length < 1) {
                return res.status(200).json({ fromDate, toDate, rooms, hotels: [] });
            }

            const date1 = new Date();
            const date2 = new Date(fromDate);
            const diffTime = Math.abs(date2 - date1);
            const bookBefore = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const totalAdults = rooms?.reduce((a, b) => a + b?.noOfAdults, 0);
            const totalChildren = rooms?.reduce((a, b) => a + b?.noOfChildren, 0);

            let hotelIds = hotels?.map((item) => item?._id);
            const roomTypes = RoomType.find({
                isDeleted: false,
                isActive: true,
                hotel: hotelIds,
                "roomOccupancies.0": { $exists: true },
            })
                .select({ amenities: 0, images: 0 })
                .lean();

            const boardTypes = HotelBoardType.find({}).lean();

            const allContracts = HotelContract.find({
                hotel: hotelIds,
                isDeleted: false,
                status: "approved",
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
                hotel: hotelIds,
                isDeleted: false,
            }).lean();

            const allAllocations = HotelAllocation.find({
                $and: [
                    { date: { $gte: new Date(fromDate) } },
                    { date: { $lte: new Date(toDate) } },
                ],
                hotel: hotelIds,
            }).lean();

            const dbResponse = await Promise.all([
                roomTypes,
                boardTypes,
                allContracts,
                allAddOns,
                allAllocations,
            ]);

            const hotelPromises = [];
            for (let i = 0; i < hotels?.length; i++) {
                const hotelPromiseReq = getSingleHotelAvailabilityQtn({
                    hotel: hotels[i],
                    noOfNights,
                    rooms,
                    dates,
                    totalAdults,
                    totalChildren,
                    roomsCount: rooms?.length,
                    bookBefore,
                    fromDate,
                    toDate,
                    roomTypes: dbResponse[0],
                    boardTypes: dbResponse[1],
                    allContracts: dbResponse[2],
                    allAddOns: dbResponse[3],
                    allAllocations: dbResponse[4],
                });
                hotelPromises.push(hotelPromiseReq);
            }

            const hotelPromisesRes = await Promise.all([...hotelPromises]);

            let filteredHotels;
            if (sortBy === "price:desc") {
                filteredHotels = hotelPromisesRes
                    ?.filter((item) => {
                        return item?.roomTypes?.length > 0;
                    })
                    .sort((a, b) => a?.lowPrice - b?.lowPrice);
            } else {
                filteredHotels = hotelPromisesRes
                    ?.filter((item) => {
                        return item?.roomTypes?.length > 0;
                    })
                    .sort((a, b) => b?.lowPrice - a?.lowPrice);
            }

            let totalHotels = filteredHotels?.length || 0;
            const splicedHotels = filteredHotels.splice(
                Number(skip) * Number(limit),
                Number(limit)
            );

            res.status(200).json({
                fromDate,
                toDate,
                rooms,
                hotels: splicedHotels,
                skip,
                limit,
                totalHotels,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelRoomTypesAndBoardTypes: async (req, res) => {
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
                .populate("boardTypes", "boardName boardShortName")
                .populate("country", "countryName")
                .populate("state", "stateName")
                .populate("city", "cityName")
                .populate("area", "areaName")
                .select("hotelName address country state starCategory city area images")
                .lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const roomTypes = await RoomType.find({
                hotel: hotelId,
                isDeleted: false,
                isActive: true,
            })
                .select("roomName")
                .lean();

            const tempRoomTypes = roomTypes?.map((item) => {
                return {
                    ...item,
                    roomTypeId: item?._id,
                    boardTypes: hotel.boardTypes?.map((boardType) => {
                        return { ...boardType, boardCode: boardType.boardShortName };
                    }),
                };
            });

            hotel.image = hotel?.images?.length > 0 ? hotel.images[0] : {};
            delete hotel.images;
            delete hotel.boardTypes;

            res.status(200).json({
                hotel,
                roomTypes: tempRoomTypes,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleRoomTypeEmptyRate: async (req, res) => {
        try {
            const { hotelId, roomTypeId, boardCode } = req.body;

            if (!hotelId || !roomTypeId || !boardCode) {
                return sendErrorResponse(res, 400, "hotelId, roomTypeId, boardCode is required");
            }

            await hotelAndRoomTypesWithEmptyRate({
                hotelId,
                roomTypeId,
                boardCode,
            })
                .then((response) => {
                    return res.status(200).json(response);
                })
                .catch((err) => {
                    return sendErrorResponse(res, 400, err);
                });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
