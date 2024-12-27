const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { Hotel, HotelBoardType, HotelAvailSearchResult } = require("../../../models/hotel");
const { b2bHotelRequestSchema } = require("../../validations/hotel/hotelRequest.schema");
const { B2BHotelRequest } = require("../../models/hotel");
const { hotelSubmitEnquiryEmail } = require("../../helpers/hotel/email");

module.exports = {
    createNewB2bHotelRequest: async (req, res) => {
        try {
            const { searchId, hotelId, rateKey } = req.body;

            const { _, error } = b2bHotelRequestSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(searchId)) {
                return sendErrorResponse(res, 400, "invalid search id");
            }
            const searchResult = await HotelAvailSearchResult.findOne({
                _id: searchId,
                resellerId: req.reseller?._id,
            });
            if (!searchResult) {
                return sendErrorResponse(
                    res,
                    404,
                    "search results not found. please search availability again"
                );
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
                isActive: true,
                isPublished: true,
            }).lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            let matchedRate;
            let matchedHotel;
            let matchedRoomType;
            for (let i = 0; i < searchResult?.hotels?.length; i++) {
                const hotel = searchResult?.hotels[i];
                if (hotel?.hotel?._id?.toString() === hotelId?.toString()) {
                    matchedHotel = hotel;
                    for (let j = 0; j < hotel?.rooms?.length; j++) {
                        for (let k = 0; k < hotel?.rooms[j]?.rates?.length; k++) {
                            const rate = hotel?.rooms[j]?.rates[k];
                            if (rate?.rateKey === rateKey) {
                                matchedRate = rate;
                                matchedRoomType = hotel?.rooms[j];
                                break;
                            }
                        }
                    }
                    break;
                }
            }
            if (!matchedRate || !matchedHotel || !matchedRoomType) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry rateKey not found, please search availability again"
                );
            }

            const totalAdults = searchResult?.rooms?.reduce((a, b) => a + b?.noOfAdults, 0);
            const totalChildren = searchResult?.rooms?.reduce((a, b) => a + b?.noOfChildren, 0);

            const boardTypes = await HotelBoardType.find({}).lean();
            const boardTypesWithKeyValues = {};
            boardTypes?.map((boardType) => {
                boardTypesWithKeyValues[boardType?.boardShortName] = boardType;
            });

            const [
                type,
                fromDate,
                toDate,
                hotelId1,
                roomTypeId,
                basePlanCode,
                mealSupplementCode,
                addOnSupplements,
                contractsObj,
                appliedPromotions,
            ] = rateKey?.split("|");

            if (
                !boardTypesWithKeyValues[matchedRate?.boardCode] ||
                !boardTypesWithKeyValues[basePlanCode]
            ) {
                return sendErrorResponse(res, 400, "boardType is missing, please try again");
            }

            const newHotelRequest = new B2BHotelRequest({
                rooms: searchResult?.rooms,
                addOnSupplements: addOnSupplements ? addOnSupplements?.split(",") : [],
                boardType: boardTypesWithKeyValues[matchedRate?.boardCode]?._id,
                fromDate: searchResult?.fromDate,
                toDate: searchResult?.toDate,
                hotel: hotelId,
                noOfNights: matchedHotel?.noOfNights,
                rateKey,
                roomsCount: searchResult?.rooms?.length,
                roomType: matchedRoomType?.roomTypeId,
                totalAdults,
                totalChildren,
                basePlan: boardTypesWithKeyValues[basePlanCode]?._id,
                extraMealSupplement: boardTypesWithKeyValues[mealSupplementCode]?._id,
                nationality: searchResult?.nationality,
                searchId,
                reseller: req.reseller?._id,
            });
            await newHotelRequest.save();

            hotelSubmitEnquiryEmail({ hotelEnquiryId: newHotelRequest?._id });

            res.status(200).json({ message: "hotel request successfully submitted" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
