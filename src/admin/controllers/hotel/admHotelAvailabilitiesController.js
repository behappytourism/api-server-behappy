const { isValidObjectId } = require("mongoose");
const moment = require("moment");

const { saveCustomCache, getSavedCache } = require("../../../config/cache");
const { sendErrorResponse } = require("../../../helpers");
const { Hotel } = require("../../../models/hotel");
const { getDates } = require("../../../utils");
const { getContractHotelRoomRates } = require("../../helpers/hotel/admHotelAvailabilitiesHelper");
const { Country } = require("../../../models");
const { Reseller, B2bSubAgentHotelMarkup, B2BMarkupProfile } = require("../../../b2b/models");
const {
    B2BSubAgentStarCategoryMarkup,
    B2BClientStarCategoryMarkup,
} = require("../../../b2b/models/hotel");
const B2BClientHotelMarkup = require("../../../b2b/models/hotel/b2bClientHotelMarkup.model");
const { MarketStrategy } = require("../../models");
const {
    singleHotelAvailabilitySchema,
} = require("../../validations/hotel/hotelAvailabilities.schema");

const ERROR = {
    CODES: {
        SUCCESS: 200,
        NOT_FOUND: 404,
        BAD_REQUEST: 400,
        INTRENAL_SERVER: 500,
    },
    MESSAGES: {
        INVALID_SEARCH: "Invalid search. at least 3 characters required",
        INVALID_HOTEL_ID: "Invalid hotel id",
        INVALID_RESELLER_ID: "Invalid reseller id",
        INVALID_DATES: "Invalid dates. please select a valid checkin and checkout dates",
        INVALID_NATIONALITY: "Invalid nationality code",
        HOTEL_NOT_FOUND: "Hotel not found",
        RESELLER_NOT_FOUND: "Reseller not found",
    },
};

const { SUCCESS, BAD_REQUEST, NOT_FOUND } = ERROR.CODES;
const {
    INVALID_SEARCH,
    HOTEL_NOT_FOUND,
    RESELLER_NOT_FOUND,
    INVALID_DATES,
    INVALID_HOTEL_ID,
    INVALID_NATIONALITY,
    INVALID_RESELLER_ID,
} = ERROR.MESSAGES;

const getSearchSuggestions = async (req, res) => {
    try {
        const { search } = req.query;

        const searchWords = search?.toLowerCase()?.split(" ");

        if (!search || search?.length < 3) {
            return sendErrorResponse(res, BAD_REQUEST, INVALID_SEARCH);
        }

        let hotels = await getSavedCache("suggestion-hotels");

        if (!hotels || !hotels.length) {
            hotels = await Hotel.find({
                isDeleted: false,
                isActive: true,
                isPublished: true,
            })
                .populate("country", "countryName")
                .populate("state", "stateName")
                .populate("city", "cityName")
                .select("_id hotelName country city state")
                .lean();

            saveCustomCache("suggestion-hotels", hotels, 60 * 60 * 24 * 10); // 10 days
        }

        const filteredHotels = hotels?.filter((hotel) => {
            return searchWords?.every((item) => {
                return hotel?.hotelName?.replaceAll(" ", "")?.toLowerCase()?.includes(item);
            });
        });

        filteredHotels?.forEach((hotel, index) => {
            const searchWord = search?.replaceAll(" ", "")?.toLowerCase();
            const hotelName = hotel?.hotelName?.replaceAll(" ", "")?.toLowerCase();
            if (hotelName === searchWord || hotelName?.startsWith(searchWord)) {
                const hotelToMove = filteredHotels?.splice(index, 1);
                hotelToMove[0] && filteredHotels?.unshift(hotelToMove[0]);
            }
        });

        const result = filteredHotels?.slice(0, 5).map((item) => ({
            _id: item._id,
            suggestionType: "HOTEL",
            countryName: item.country.countryName,
            stateName: item.state.stateName,
            cityName: item.city.cityName,
            hotelName: item.hotelName,
            hotelId: item._id,
        }));

        res.status(SUCCESS).json({ hotels: result });
    } catch (err) {
        sendErrorResponse(res, INTRENAL_SERVER, err);
    }
};

const getSingleHotelAvailability = async (req, res) => {
    try {
        const { fromDate, toDate, rooms, nationality, hotelId, priceType, resellerId } = req.body;

        const { _, error } = singleHotelAvailabilitySchema.validate(req.body);
        if (error) {
            return sendErrorResponse(res, BAD_REQUEST, error.details[0].message);
        }

        if (!isValidObjectId(hotelId)) {
            return sendErrorResponse(res, BAD_REQUEST, INVALID_HOTEL_ID);
        }

        if (!isValidObjectId(resellerId)) {
            return sendErrorResponse(res, BAD_REQUEST, INVALID_RESELLER_ID);
        }

        const reseller = await Reseller.findOne({ _id: resellerId });

        if (!reseller) {
            return sendErrorResponse(res, NOT_FOUND, RESELLER_NOT_FOUND);
        }

        const dates = getDates(fromDate, toDate);

        const fromDateMoment = moment(fromDate);
        const toDateMoment = moment(toDate);
        const today = moment().startOf("day");

        if (fromDateMoment.isSameOrAfter(toDateMoment) || fromDateMoment.isBefore(today)) {
            return sendErrorResponse(res, BAD_REQUEST, INVALID_DATES);
        }

        const noOfNights = dates.length - 1;

        const filters = {
            _id: hotelId,
            isDeleted: false,
            isActive: true,
            isPublished: true,
        };

        const projection =
            "hotelName boardTypes isApiConnected hbId isContractAvailable openDays starCategory area city state country ottilaId iolxId accommodationType address";

        const hotel = await Hotel.findOne(filters)
            .populate("boardTypes city state country accommodationType")
            .select(projection)
            .lean();

        if (!hotel) {
            return sendErrorResponse(res, NOT_FOUND, HOTEL_NOT_FOUND);
        }

        let marketStrategy, profileMarkup;
        const referredById = reseller?.referredBy;

        // Determine marketStrategy based on the reseller's role
        if (reseller.role === "reseller") {
            marketStrategy = await MarketStrategy.findOne({ _id: reseller?.marketStrategy });
        } else {
            const mainAgent = await Reseller.findById(referredById).select("marketStrategy").lean();
            marketStrategy = await MarketStrategy.findOne({ _id: mainAgent?.marketStrategy });
        }

        // Determine profileMarkup based on the reseller's role
        profileMarkup = await B2BMarkupProfile.findOne({
            resellerId: reseller.role === "reseller" ? resellerId : referredById,
        });

        // Fetch client markups
        const [clientMarkups, clientStarCategoryMarkups] = await Promise.all([
            B2BClientHotelMarkup.find({ resellerId, hotelId }).lean(),
            B2BClientStarCategoryMarkup.find({ resellerId, name: hotel?.starCategory }).lean(),
        ]);

        let subAgentMarkups, subAgentStarCategoryMarkups;
        if (reseller?.role === "sub-agent") {
            // Fetch sub-agent markups if the role is sub-agent
            [subAgentMarkups, subAgentStarCategoryMarkups] = await Promise.all([
                B2bSubAgentHotelMarkup.find({ resellerId, hotelId }),
                B2BSubAgentStarCategoryMarkup.find({
                    resellerId,
                    name: hotel?.starCategory,
                }).lean(),
            ]);
        }

        const date1 = moment();
        const date2 = moment(fromDate);
        const diffDays = date2.diff(date1, "days");
        const bookBefore = Math.ceil(Math.abs(diffDays));

        const totalAdults = rooms?.reduce((a, b) => a + b?.noOfAdults, 0);
        const totalChildren = rooms?.reduce((a, b) => a + b?.noOfChildren, 0);

        if (nationality && nationality !== "") {
            const nationalityDetail = await Country.findOne({
                isocode: nationality?.toUpperCase(),
            });

            if (!nationalityDetail) {
                return sendErrorResponse(res, BAD_REQUEST, INVALID_NATIONALITY);
            }
        }

        const response = await getContractHotelRoomRates(
            priceType,
            hotel,
            nationality,
            fromDate,
            toDate,
            dates,
            rooms,
            noOfNights,
            totalAdults,
            totalChildren,
            bookBefore,
            clientMarkups,
            clientStarCategoryMarkups,
            subAgentMarkups,
            subAgentStarCategoryMarkups,
            marketStrategy,
            profileMarkup,
            reseller
        );

        const expiresIn =
            (new Date(new Date(new Date().setMinutes(new Date().getMinutes() + 1))).getTime() -
                new Date().getTime()) /
            1000;

        res.status(SUCCESS).json({
            searchId: null,
            expiresIn,
            fromDate,
            toDate,
            noOfNights,
            roomPaxes: rooms,
            hotel,
            rooms: response?.rooms || [],
        });
    } catch (error) {
        console.error(error);
        return sendErrorResponse(res, error?.statusCode, error?.message);
    }
};

module.exports = {
    getSearchSuggestions,
    getSingleHotelAvailability,
};
