const { isValidObjectId } = require("mongoose");

const { Hotel, RoomType, HotelBoardType } = require("../../../models/hotel");

const hotelAndRoomTypesWithEmptyRate = async ({ hotelId, roomTypeId, boardCode }) => {
    try {
        if (!isValidObjectId(hotelId)) {
            throw new Error("invalid hotel id");
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
            .populate("area", "areaName")
            .select("hotelName starCategory country state city area")
            .lean();
        if (!hotel) {
            throw new Error("hotel not found");
        }

        if (!isValidObjectId(roomTypeId)) {
            throw new Error("invalid room-type id");
        }
        const roomType = await RoomType.findOne({
            _id: roomTypeId,
            isDeleted: false,
            hotel: hotelId,
        })
            .select("roomName")
            .lean();
        if (!roomType) {
            throw new Error("room type not found");
        }

        const boardType = await HotelBoardType.findOne({
            boardShortName: boardCode?.toUpperCase(),
        }).lean();
        if (!boardType) {
            throw new Error("board type not found");
        }

        return {
            hotel,
            roomType,
            boardType,
            rates: [
                {
                    occupancyShortName: "SGL",
                    price: "",
                },
                {
                    occupancyShortName: "DBL",
                    price: "",
                },
                {
                    occupancyShortName: "TPL",
                    price: "",
                },
                {
                    occupancyShortName: "CWB",
                    price: "",
                },
                {
                    occupancyShortName: "CNB",
                    price: "",
                },
            ],
        };
    } catch (err) {
        throw err;
    }
};

module.exports = hotelAndRoomTypesWithEmptyRate;
