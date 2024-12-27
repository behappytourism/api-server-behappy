const { isValidObjectId, Types } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { Attraction, AttractionActivity } = require("../../../models");
const { RoomType, Hotel } = require("../../../models/hotel");
const {
    B2BClientAttractionMarkup,
    B2BSubAgentAttractionMarkup,
    B2bClientHotelMarkup,
    Reseller,
} = require("../../models");
const {
    B2BSubAgentStarCategoryMarkup,
    B2BClientStarCategoryMarkup,
} = require("../../models/hotel");
const B2BClientHotelMarkup = require("../../models/hotel/b2bClientHotelMarkup.model");
const B2BSubAgentHotelMarkup = require("../../models/hotel/b2bSubAgentHotelMarkup.model");
const {
    b2bClientAttractionMarkupSchema,
} = require("../../validations/b2bClientAttractionMarkupSchema");
const {
    b2bHotelClientMarkupSchema,
    b2bHotelSubAgentMarkupSchema,
} = require("../../validations/hotel/hotelMarkup.schema");

module.exports = {
    upsertB2bClientHotelMarkup: async (req, res) => {
        try {
            const { markupType, markup, roomTypeId } = req.body;

            const { _, error } = b2bHotelClientMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(roomTypeId)) {
                return sendErrorResponse(res, 400, "Invalid roomt type id");
            }

            if (markup < 0) {
                return sendErrorResponse(res, 400, "Markup should be greater than zero");
            }

            const roomTypeDetail = await RoomType.findOne({
                _id: roomTypeId,
                isDeleted: false,
            });

            if (!roomTypeDetail) {
                return sendErrorResponse(res, 400, "Room type Not Found");
            }

            const b2bClientHotelMarkup = await B2bClientHotelMarkup.findOneAndUpdate(
                {
                    roomTypeId,
                    resellerId: req.reseller._id,
                },
                {
                    roomTypeId,
                    markupType,
                    markup,
                    resellerId: req.reseller._id,
                },
                { upsert: true, new: true, runValidators: true }
            );

            res.status(200).json(b2bClientHotelMarkup);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    upsertB2bSubAgentHotelMarkup: async (req, res) => {
        try {
            const { markupType, markup, roomTypeId, subAgentId } = req.body;

            const { _, error } = b2bHotelSubAgentMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(roomTypeId)) {
                return sendErrorResponse(res, 400, "Invalid roomt type id");
            }

            if (markup < 0) {
                return sendErrorResponse(res, 400, "Markup should be greater than zero");
            }

            const subAgent = await Reseller.findOne({
                _id: subAgentId,
                referredBy: req?.reseller?._id,
            });

            if (!subAgent) {
                return sendErrorResponse(res, 400, "subagent not found");
            }

            const roomTypeDetail = await RoomType.findOne({
                _id: roomTypeId,
                isDeleted: false,
            });

            if (!roomTypeDetail) {
                return sendErrorResponse(res, 400, "Room type Not Found");
            }

            const b2bSubAgentHotelMarkup = await B2BSubAgentHotelMarkup.findOneAndUpdate(
                {
                    roomTypeId,
                    resellerId: subAgentId,
                },
                {
                    roomTypeId,
                    markupType,
                    markup,
                    resellerId: subAgentId,
                },
                { upsert: true, new: true, runValidators: true }
            );

            res.status(200).json(b2bSubAgentHotelMarkup);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    upsertB2bClientCategoryMarkup: async (req, res) => {
        try {
            const { markupType, markup, name } = req.body;

            // const { _, error } = b2bHotelMarkupSchema.validate(req.body);
            // if (error) {
            //     return sendErrorResponse(res, 400, error.details[0]?.message);
            // }

            if (markup < 0) {
                return sendErrorResponse(res, 400, "Markup should be greater than zero");
            }

            const b2bClientHotelMarkup = await B2BClientStarCategoryMarkup.findOneAndUpdate(
                {
                    name,
                    resellerId: req.reseller._id,
                },
                { name, markupType, markup, resellerId: req.reseller._id },
                { upsert: true, new: true, runValidators: true }
            );

            res.status(200).json(b2bClientHotelMarkup);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    upsertB2bSubAgentCategoryMarkup: async (req, res) => {
        try {
            const { markupType, markup, name, subAgentId } = req.body;

            // const { _, error } = b2bHotelMarkupSchema.validate(req.body);
            // if (error) {
            //     return sendErrorResponse(res, 400, error.details[0]?.message);
            // }

            if (markup < 0) {
                return sendErrorResponse(res, 400, "Markup should be greater than zero");
            }

            const subAgent = await Reseller.findOne({
                _id: subAgentId,
                referredBy: req?.reseller?._id,
            });

            if (!subAgent) {
                return sendErrorResponse(res, 400, "subagent not found");
            }

            const b2bSubAgentHotelMarkup = await B2BSubAgentStarCategoryMarkup.findOneAndUpdate(
                {
                    name,
                    resellerId: subAgentId,
                },
                { name, markupType, markup, resellerId: subAgentId },
                { upsert: true, new: true, runValidators: true }
            );

            res.status(200).json(b2bSubAgentHotelMarkup);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllRoomTypeWithStarCategory: async (req, res) => {
        try {
            let RoomTypeLists = await RoomType.aggregate([
                {
                    $match: { isDeleted: false },
                },
                {
                    $lookup: {
                        from: "b2bclienthotelmarkups",
                        localField: "_id",
                        foreignField: "roomTypeId",
                        as: "clientMarkup",
                    },
                },
                {
                    $lookup: {
                        from: "b2bsubagenthotelmarkups",
                        localField: "_id",
                        foreignField: "roomTypeId",
                        as: "subAgentMarkup",
                    },
                },
                {
                    $lookup: {
                        from: "b2bclienthotelmarkups",
                        let: {
                            roomType: "$_id",
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: [
                                                    "$resellerId",
                                                    Types.ObjectId(req.reseller._id),
                                                ],
                                            },
                                            {
                                                $eq: ["$roomTypeId", Types.ObjectId(roomType)],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "clientMarkup",
                    },
                },
                {
                    $lookup: {
                        from: "b2bsubagenthotelmarkups",
                        let: {
                            roomType: "$_id",
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ["$resellerId", Types.ObjectId(subAgentId)],
                                            },
                                            {
                                                $eq: ["$roomTypeId", Types.ObjectId(roomType)],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "subAgentMarkup",
                    },
                },
                {
                    $set: {
                        clientMarkup: { $arrayElemAt: ["$clientMarkup", 0] },
                        subAgentMarkup: { $arrayElemAt: ["$subAgentMarkup", 0] },
                    },
                },
                {
                    $lookup: {
                        from: "hotels",
                        localField: "hotel",
                        foreignField: "_id",
                        as: "hotel",
                    },
                },

                {
                    $unwind: "$hotel",
                },
                {
                    $match: { "hotel.isDeleted": false },
                },
            ]);

            const categoryList = [];

            RoomTypeLists?.forEach((roomTypeList) => {
                const category = roomTypeList.hotel.starCategory;

                const existingCategoryIndex = categoryList.findIndex(
                    (a) => a.starCategory === category
                );

                if (existingCategoryIndex !== -1) {
                    const existingCategory = categoryList[existingCategoryIndex];

                    const existingHotelIndex = existingCategory?.hotel.findIndex(
                        (a) => a.hotelId.toString() === roomTypeList?.hotel?._id.toString()
                    );

                    if (existingHotelIndex !== -1) {
                        const existingHotel = existingCategory.hotel[existingHotelIndex];

                        existingHotel.roomType.push({
                            roomTypeId: roomTypeList?._id,
                            roomName: roomTypeList?.roomName,
                            clientMarkup: {
                                markup: roomTypeList?.clientMarkup?.markup || 0,
                                markupType: roomTypeList?.clientMarkup?.markupType || "flat",
                            },
                            subAgentMarkup: {
                                markup: roomTypeList.subAgentMarkup?.markup || 0,
                                markupType: roomTypeList.subAgentMarkup?.markupType || "flat",
                            },
                        });
                    } else {
                        existingCategory.hotel.push({
                            hotelId: roomTypeList?.hotel?._id,
                            hotelName: roomTypeList?.hotel?.hotelName,
                            roomType: [
                                {
                                    roomTypeId: roomTypeList?._id,
                                    roomName: roomTypeList?.roomName,
                                    clientMarkup: {
                                        markup: roomTypeList?.clientMarkup?.markup || 0,
                                        markupType:
                                            roomTypeList?.clientMarkup?.markupType || "flat",
                                    },
                                    subAgentMarkup: {
                                        markup: roomTypeList?.subAgentMarkup?.markup || 0,
                                        markupType:
                                            roomTypeList?.subAgentMarkup?.markupType || "flat",
                                    },
                                },
                            ],
                        });
                    }
                } else {
                    const newCategory = {
                        starCategory: category,
                        hotel: [
                            {
                                hotelId: roomTypeList?.hotel?._id,
                                hotelName: roomTypeList?.hotel?.hotelName,
                                roomType: [
                                    {
                                        roomTypeId: roomTypeList?._id,
                                        roomName: roomTypeList?.roomName,
                                        clientMarkup: {
                                            markup: roomTypeList?.clientMarkup?.markup || 0,
                                            markupType:
                                                roomTypeList?.clientMarkup?.markupType || "flat",
                                        },
                                        subAgentMarkup: {
                                            markup: roomTypeList?.subAgentMarkup?.markup || 0,
                                            markupType:
                                                roomTypeList?.subAgentMarkup?.markupType || "flat",
                                        },
                                    },
                                ],
                            },
                        ],
                    };
                    categoryList.push(newCategory);
                }
            });

            const order = ["5", "4", "3", "2", "apartment"];

            categoryList.sort((a, b) => {
                const indexA = order.indexOf(a.starCategory);
                const indexB = order.indexOf(b.starCategory);

                return indexA - indexB;
            });

            res.status(200).json(categoryList);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    // deleteB2bClientAttractionMarkup: async (req, res) => {
    //     try {
    //         const { id } = req.params;

    //         if (!isValidObjectId(id)) {
    //             return sendErrorResponse(res, 400, "Invalid markup id");
    //         }

    //         const b2bClientAttractionMarkups = await B2BClientAttractionMarkup.findByIdAndDelete(
    //             id
    //         );

    //         if (!b2bClientAttractionMarkups) {
    //             return sendErrorResponse(res, 404, "B2C Attraction markup not found");
    //         }

    //         res.status(200).json({
    //             message: "b2c attraction markup deleted successfully",
    //         });
    //     } catch (err) {
    //         sendErrorResponse(res, 500, err);
    //     }
    // },

    getAllCategory: async (req, res) => {
        try {
            const categories = ["1", "2", "3", "4", "5", "appartment"];

            const clientMarkup = await B2BClientStarCategoryMarkup.find({
                resellerId: req.reseller._id,
                isDeleted: false,
            });

            const categoryList = [];

            for (const category of categories) {
                const selectedClientMarkup = clientMarkup?.find((starCate) => {
                    return starCate?.name?.toString() === category?.toString();
                });

                categoryList.push({
                    clientMarkup: {
                        markup: selectedClientMarkup?.markup || 0,
                        markupType: selectedClientMarkup?.markupType || "flat",
                    },

                    name: category,
                });
            }

            res.status(200).json(categoryList);
        } catch (error) {
            console.log(error, "eror");
            sendErrorResponse(res, 500, error);
        }
    },

    getAllHotels: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchInput } = req.query;

            let filters1 = { isDeleted: false };
            if (searchInput && searchInput !== "") {
                filters1.hotelName = { $regex: searchInput, $options: "i" };
            }

            const hotels = await Hotel.find(filters1)
                .select("hotelName")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const total = await Hotel.find(filters1).count();

            res.status(200).json({ hotels, total, skip: Number(skip), limit: Number(limit) });
        } catch (error) {
            sendErrorResponse(res, 500, error);
        }
    },

    getAllRoomTypes: async (req, res) => {
        try {
            const { hotelId } = req.params;

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "Invalid hotelId ");
            }

            const roomTypes = await RoomType.find({ isDeleted: false, hotel: hotelId });

            const clientMarkup = await B2BClientHotelMarkup.find({
                resellerId: req?.reseller?._id,
                isDeleted: false,
            });

            const roomTypeList = [];

            roomTypes.forEach((roomType) => {
                const selectedClientMarkup = clientMarkup.find(
                    (clientMkup) => clientMkup?.roomTypeId?.toString() === roomType?._id.toString()
                );

                roomTypeList.push({
                    roomName: roomType?.roomName,
                    roomTypeId: roomType?._id,
                    hotelId: roomType?.hotel,
                    clientMarkup: {
                        markup: selectedClientMarkup?.markup || 0,
                        markupType: selectedClientMarkup?.markupType || "flat",
                    },
                });
            });

            res.status(200).json(roomTypeList);
        } catch (err) {
            console.error(err);

            sendErrorResponse(res, 500, err);
        }
    },

    getAllCategorySubAgent: async (req, res) => {
        try {
            const { resellerId } = req.params;

            const categories = ["1", "2", "3", "4", "5", "appartment"];

            const subAgentMarkup = await B2BSubAgentStarCategoryMarkup.find({
                resellerId: resellerId,
                isDeleted: false,
            });

            const categoryList = [];

            for (const category of categories) {
                const selectedSubAgentMarkup = subAgentMarkup?.find((starCate) => {
                    return starCate?.name?.toString() === category?.toString();
                });

                categoryList.push({
                    subAgentMarkup: {
                        markup: selectedSubAgentMarkup?.markup || 0,
                        markupType: selectedSubAgentMarkup?.markupType || "flat",
                    },
                    name: category,
                });
            }

            res.status(200).json(categoryList);
        } catch (error) {
            console.log(error, "eror");
            sendErrorResponse(res, 500, error);
        }
    },

    getAllRoomTypesSubAgent: async (req, res) => {
        try {
            const { hotelId, resellerId } = req.params;

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "Invalid hotelId ");
            }

            const roomTypes = await RoomType.find({ isDeleted: false, hotel: hotelId });

            const subAgentMarkup = await B2BSubAgentHotelMarkup.find({
                resellerId: resellerId,
                isDeleted: false,
            });

            const roomTypeList = [];

            roomTypes.forEach((roomType) => {
                const selectedSubAgentMarkup = subAgentMarkup?.find(
                    (subAgentMkup) =>
                        subAgentMkup?.roomTypeId?.toString() === roomType?._id.toString()
                );

                roomTypeList.push({
                    roomName: roomType?.roomName,
                    roomTypeId: roomType?._id,
                    hotelId: roomType?.hotel,
                    subAgentMarkup: {
                        markup: selectedSubAgentMarkup?.markup || 0,
                        markupType: selectedSubAgentMarkup?.markupType || "flat",
                    },
                });
            });

            res.status(200).json(roomTypeList);
        } catch (err) {
            console.error(err);

            sendErrorResponse(res, 500, err);
        }
    },
};
