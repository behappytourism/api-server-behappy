const { isValidObjectId, Types } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const {
    Hotel,
    RoomType,
    HotelBedRoomType,
    HotelAmenity,
    RoomOccupancy,
} = require("../../../models/hotel");
const {
    roomTypeSchema,
    hotelBedRoomTypeToMainSchema,
} = require("../../validations/hotel/roomType.schema");

module.exports = {
    addNewRoomType: async (req, res) => {
        try {
            const {
                hotel,
                amenities,
                adultAgeFrom,
                adultAgeTo,
                childAgeFrom,
                childAgeTo,
                infantAgeFrom,
                infantAgeTo,
                roomOccupancies,
                hotelBedRooms,
            } = req.body;

            const { _, error } = roomTypeSchema.validate({
                ...req.body,
                amenities: amenities ? JSON.parse(amenities) : [],
                roomOccupancies: roomOccupancies ? JSON.parse(roomOccupancies) : [],
                hotelBedRooms: hotelBedRooms ? JSON.parse(hotelBedRooms) : [],
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (
                Number(adultAgeFrom) <= Number(childAgeFrom) ||
                Number(adultAgeTo) <= Number(childAgeTo) ||
                Number(childAgeFrom) <= Number(infantAgeFrom) ||
                Number(childAgeTo) <= Number(infantAgeTo) ||
                Number(adultAgeFrom) > Number(adultAgeTo) ||
                Number(childAgeFrom) > Number(childAgeTo) ||
                Number(infantAgeFrom) > Number(infantAgeTo)
            ) {
                return sendErrorResponse(res, 400, "invalid age limit");
            }

            if (!isValidObjectId(hotel)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const hotelDetails = await Hotel.findOne({
                _id: hotel,
                isDeleted: false,
                isPublished: true,
            });
            if (!hotelDetails) {
                return sendErrorResponse(res, 404, "hotel details not found");
            }

            let images = [];
            for (let i = 0; i < req.files?.length; i++) {
                const img = "/" + req.files[i]?.path?.replace(/\\/g, "/");
                images.push({ path: img, isRelative: true });
            }

            let parsedAmenities = [];
            if (amenities) {
                parsedAmenities = JSON.parse(amenities);
            }

            let parsedRoomOccupancies = [];
            if (roomOccupancies) {
                parsedRoomOccupancies = JSON.parse(roomOccupancies);
            }

            const newRoomType = new RoomType({
                ...req.body,
                images,
                amenities: parsedAmenities,
                roomOccupancies: parsedRoomOccupancies,
                hotelBedRooms: hotelBedRooms ? JSON.parse(hotelBedRooms) : [],
                hotelLoadedFrom: "contract",
            });
            await newRoomType.save();

            res.status(200).json({
                message: "room type successfully added",
                _id: newRoomType?._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateRoomType: async (req, res) => {
        try {
            const { roomTypeId } = req.params;
            const {
                amenities,
                adultAgeLimit,
                childAgeLimit,
                infantAgeLimit,
                roomOccupancies,
                oldImages,
                hotelBedRooms,
            } = req.body;

            if (!isValidObjectId(roomTypeId)) {
                return sendErrorResponse(res, 400, "invalid room type id");
            }

            const { _, error } = roomTypeSchema.validate({
                ...req.body,
                amenities: amenities ? JSON.parse(amenities) : [],
                roomOccupancies: roomOccupancies ? JSON.parse(roomOccupancies) : [],
                oldImages: oldImages ? JSON.parse(oldImages) : [],
                hotelBedRooms: hotelBedRooms ? JSON.parse(hotelBedRooms) : [],
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            // validating age limit
            if (
                Number(adultAgeLimit) <= Number(infantAgeLimit) ||
                Number(childAgeLimit) <= Number(infantAgeLimit)
            ) {
                return sendErrorResponse(res, 400, "invalid age limit");
            }

            let images = oldImages ? JSON.parse(oldImages) : [];
            for (let i = 0; i < req.files?.length; i++) {
                const img = "/" + req.files[i]?.path?.replace(/\\/g, "/");
                images.push({ path: img, isRelative: true });
            }

            let parsedAmenities = [];
            if (amenities) {
                parsedAmenities = JSON.parse(amenities);
            }

            let parsedRoomOccupancies = [];
            if (roomOccupancies) {
                parsedRoomOccupancies = JSON.parse(roomOccupancies);
            }

            const roomType = await RoomType.findOneAndUpdate(
                {
                    _id: roomTypeId,
                    isDeleted: false,
                },
                {
                    ...req.body,
                    images,
                    amenities: parsedAmenities,
                    roomOccupancies: parsedRoomOccupancies,
                    hotelBedRooms: hotelBedRooms ? JSON.parse(hotelBedRooms) : [],
                },
                {
                    runValidators: true,
                    new: true,
                }
            );
            if (!roomType) {
                return sendErrorResponse(res, 404, "room type not found");
            }

            res.status(200).json({
                message: "room type successfully updated",
                _id: roomTypeId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteRoomType: async (req, res) => {
        try {
            const { roomTypeId } = req.params;

            if (!isValidObjectId(roomTypeId)) {
                return sendErrorResponse(res, 400, "invalid room type id");
            }

            const roomType = await RoomType.findOneAndUpdate(
                {
                    _id: roomTypeId,
                    isDeleted: false,
                },
                { isDeleted: true }
            );
            if (!roomType) {
                return sendErrorResponse(res, 404, "room type not found");
            }

            res.status(200).json({
                message: "room type successfully deleted",
                _id: roomTypeId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelRoomTypes: async (req, res) => {
        try {
            const { hotelId } = req.params;
            const { skip = 0, limit = 10, searchQuery } = req.query;

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
            }).lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const filters = { hotel: Types.ObjectId(hotelId), isDeleted: false };
            if (searchQuery && searchQuery !== "") {
                filters.roomName = { $regex: searchQuery, $options: "i" };
            }

            const roomTypes = await RoomType.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip);

            const totalRoomTypes = await RoomType.find(filters).count();

            res.status(200).json({
                totalRoomTypes,
                skip: Number(skip),
                limit: Number(limit),
                roomTypes,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleRoomType: async (req, res) => {
        try {
            const { roomTypeId } = req.params;

            if (!isValidObjectId(roomTypeId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const roomType = await RoomType.findOne({
                _id: roomTypeId,
                isDeleted: false,
            });
            if (!roomType) {
                return sendErrorResponse(res, 404, "room type not found");
            }

            res.status(200).json(roomType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelHotelBedRoomTypes: async (req, res) => {
        try {
            const { hotelId } = req.params;

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
            }).lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const hotelBedRoomTypes = await HotelBedRoomType.aggregate([
                { $match: { hotel: Types.ObjectId(hotelId) } },
                // {
                //     $lookup: {
                //         from: "roomtypes",
                //         localField: "hbId",
                //         foreignField: "hotelBedRooms",
                //         as: "roomTypes",
                //         pipeline: [
                //             {
                //                 $match: {
                //                     isDeleted: false,
                //                     hotel: Types.ObjectId(hotelId),
                //                 },
                //             },
                //             {
                //                 $project: {
                //                     _id: 1,
                //                     roomName: 1,
                //                 },
                //             },
                //         ],
                //     },
                // },
            ]);

            res.status(200).json(hotelBedRoomTypes);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addHotelBedRoomTypeToMainRoomType: async (req, res) => {
        try {
            const { hotelId, hbRoomTypeId } = req.body;

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            if (!isValidObjectId(hbRoomTypeId)) {
                return sendErrorResponse(res, 400, "invalid hotel bed room type id");
            }

            const { _, error } = hotelBedRoomTypeToMainSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const hotel = await Hotel.findOne({
                isDeleted: false,
                _id: hotelId,
            });
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const hbRoomType = await HotelBedRoomType.findOne({
                _id: hbRoomTypeId,
            });
            if (!hbRoomType) {
                return sendErrorResponse(res, 404, "hotel bed room type not found");
            }

            const newRoomType = new RoomType({
                hotel: hotelId,
                roomName: hbRoomType?.roomName,
                serviceBy: "NIGHT",
                roomOccupancies: [],
                infantAgeFrom: 0,
                infantAgeTo: 5.99,
                childAgeFrom: 6,
                childAgeTo: 11.99,
                adultAgeFrom: 12,
                adultAgeTo: 999,
                amenities: hbRoomType?.amenities,
                images: hbRoomType.images || [],
                hotelBedRooms: [hbRoomType?.hbId],
                isActive: true,
                hotelLoadedFrom: "hotel-bed",
            });
            await newRoomType.save();

            res.status(200).json(newRoomType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    roomTypesInitialData: async (req, res) => {
        try {
            const { hotelId } = req.params;

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
            }).lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const promises = [
                HotelBedRoomType.find({
                    hotel: Types.ObjectId(hotelId),
                }).lean(),
                HotelAmenity.find({}).lean(),
                RoomOccupancy.find({
                    isDeleted: false,
                    isActive: true,
                })
                    .select({
                        occupancyName: 1,
                        shortName: 1,
                        combinations: 1,
                        maxCount: 1,
                        extraBed: 1,
                        rollBed: 1,
                        displayName: 1,
                    })
                    .lean(),
            ];

            const response = await Promise.all(promises);

            res.status(200).json({
                hbRoomTypes: response[0],
                hotelAmenities: response[1],
                roomOccupancies: response[2],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
