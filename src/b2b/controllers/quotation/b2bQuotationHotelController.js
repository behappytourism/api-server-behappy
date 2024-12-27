const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const {
    Hotel,
    RoomType,
    HotelBoardType,
    HotelAllocation,
    HotelAddOn,
    HotelContract,
} = require("../../../models/hotel");
const { singleRoomTypeRate } = require("../../helpers/quotation");
const {
    singleRoomTypeRateSchema,
    qtnHotelAvailabilitySchema,
} = require("../../validations/quoatation/b2bHotelQuotation.schema");
const { getDates } = require("../../../utils");
const { getSingleHotelAvailabilityQtn } = require("../../helpers/quotation/quotationHotelHelper");

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
            } = req.body;

            const { _, error } = singleRoomTypeRateSchema.validate(req.body);
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
                boardTypeCode
            );

            res.status(200).json(details);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getQtnHotelAvailability: async (req, res) => {
        try {
            const { fromDate, toDate, searchQuery, rooms } = req.body;
            const { skip = 0, limit = 10, sortBy, starCategories } = req.query;

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

            console.timeEnd("hotel find");

            if (hotels?.length < 1) {
                return res.status(200).json({ fromDate, toDate, rooms, hotels: [] });
            }

            const date1 = new Date();
            const date2 = new Date(fromDate);
            const diffTime = Math.abs(date2 - date1);
            const bookBefore = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const totalAdults = rooms?.reduce((a, b) => a + b?.noOfAdults, 0);
            const totalChildren = rooms?.reduce((a, b) => a + b?.noOfChildren, 0);

            console.time("contract fetch");

            console.time("room fetch");
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

            console.timeEnd("contract fetch");
            const parsedStarCategories = starCategories ? JSON.parse(starCategories) : [];

            const filteredHotels = hotelPromisesRes.filter((item) => {
                return parsedStarCategories?.length > 0
                    ? parsedStarCategories?.some(
                          (stCategory) =>
                              stCategory?.toString() === item?.hotel?.starCategory?.toString()
                      )
                    : true;
            });
            let sortedHotels = [];
            if (sortBy === "price:desc") {
                sortedHotels = filteredHotels
                    ?.filter((item) => {
                        return item?.roomTypes?.length > 0;
                    })
                    .sort((a, b) => a?.lowPrice - b?.lowPrice);
            } else {
                sortedHotels = filteredHotels
                    ?.filter((item) => {
                        return item?.roomTypes?.length > 0;
                    })
                    .sort((a, b) => b?.lowPrice - a?.lowPrice);
            }

            const splicedHotels = sortedHotels.splice(Number(skip) * Number(limit), Number(limit));

            res.status(200).json({ fromDate, toDate, rooms, hotels: splicedHotels });
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

            const hotels = await Hotel.aggregate([
                {
                    $match: {
                        hotelName: { $regex: search, $options: "i" },
                        isDeleted: false,
                        isActive: true,
                        isPublished: true,
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
                        cityId: "$city._id",
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
};
