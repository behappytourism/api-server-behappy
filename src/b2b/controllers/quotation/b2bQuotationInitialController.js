const { Types, isValidObjectId } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const {
    Airport,
    Excursion,
    Visa,
    VisaType,
    AttractionActivity,
    VisaNationality,
} = require("../../../models");
const { City, Area, State } = require("../../../models/global");

module.exports = {
    getAllInital: async (req, res) => {
        try {
            const airports = await Airport.aggregate([
                { $match: { isDeleted: false } },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "countries",
                        localField: "country",
                        foreignField: "_id",
                        as: "country",
                    },
                },
                { $unwind: "$terminals" },
                { $match: { "terminals.access": "quotation" } },
            ]);

            const visaCountry = await Visa.find({ isDeleted: false }).select("country").populate({
                path: "country",
                select: "countryName",
            });

            res.status(200).json({
                airports,
                visaCountry,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllNationality: async (req, res) => {
        try {
            const visaNationalities = await VisaNationality.aggregate([
                {
                    $match: { isDeleted: false },
                },
                {
                    $lookup: {
                        from: "countries", // Assuming the collection name is 'nationalities'
                        localField: "nationality",
                        foreignField: "_id",
                        as: "nationality",
                    },
                },
                {
                    $unwind: "$nationality",
                },
                {
                    $project: {
                        slug: 1,
                        nationality: "$nationality.countryName",
                    },
                },
            ]);

            if (!visaNationalities) {
                return sendErrorResponse(res, 400, "No Visa Nationalities Found ");
            }

            res.status(200).json(visaNationalities);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listVisaType: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid VisaType id");
            }

            const visaNationality = await VisaNationality.findOne({
                _id: id,
                isDeleted: false,
            }).populate("visas.visaType");

            if (!visaNationality) {
                return sendErrorResponse(res, 400, "No Visa Nationality ");
            }

            let visaTypes = visaNationality.visas
                .filter(
                    (visa) =>
                        !visa.isDeleted && visa?.createdFor.toLocaleLowerCase() === "quotation"
                ) // Filter out visas with isDeleted = true
                .map((visa) => ({
                    visaId: visa.visaType._id,
                    processingTimeFormat: visa.visaType.processingTimeFormat,
                    processingTime: visa.visaType.processingTime,
                    validity: visa.visaType.validity,
                    validityTimeFormat: visa.visaType.validityTimeFormat,
                    visaName: visa.visaType.visaName,
                    adultPrice: visa.adultPrice,
                    childPrice: visa.childPrice,
                }));

            res.status(200).json(visaTypes);
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    getExcursionsList: async (req, res) => {
        try {
            const { date } = req.query;

            const excursions = await Excursion.aggregate([
                {
                    $match: {
                        isQuotation: true,
                        isCarousel: true,
                    },
                },
                {
                    $lookup: {
                        from: "attractionactivities", // Replace 'vehiclecollection' with the actual name of your vehicle collection
                        localField: "activityId",
                        foreignField: "_id",
                        as: "activity",
                    },
                },

                {
                    $lookup: {
                        from: "attractions", // Replace 'vehiclecollection' with the actual name of your vehicle collection
                        localField: "activity.attraction",
                        foreignField: "_id",
                        as: "attraction",
                    },
                },
                {
                    $lookup: {
                        from: "excursiontransferpricings", // Replace 'vehiclecollection' with the actual name of your vehicle collection
                        localField: "transferPricing",
                        foreignField: "_id",
                        as: "transferPricing",
                    },
                },
                {
                    $lookup: {
                        from: "excursionticketpricings", // Replace 'vehiclecollection' with the actual name of your vehicle collection
                        localField: "ticketPricing",
                        foreignField: "_id",
                        as: "ticketPricing",
                    },
                },
                {
                    $set: {
                        attraction: {
                            $arrayElemAt: ["$attraction.title", 0],
                        },
                        ticketPricing: {
                            $arrayElemAt: ["$ticketPricing", 0],
                        },
                        transferPricing: {
                            $arrayElemAt: ["$transferPricing", 0],
                        },
                        image: {
                            $arrayElemAt: ["$attraction.images", 0],
                        },
                        _id: {
                            $arrayElemAt: ["$activity._id", 0],
                        },
                        name: {
                            $arrayElemAt: ["$activity.name", 0],
                        },
                    },
                },

                {
                    $addFields: {
                        ticketPrice: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$ticketPricing.ticketPrice",
                                        as: "ticketPrice",
                                        cond: {
                                            $and: [
                                                { $lt: ["$$ticketPrice.fromDate", new Date(date)] },
                                                { $gt: ["$$ticketPrice.toDate", new Date(date)] },
                                                { $ne: ["$$ticketPrice.adultPrice", null] },
                                                { $ne: ["$$ticketPrice.childPrice", null] },
                                            ],
                                        },
                                    },
                                },
                                0, // Index 0 to get the first element
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        sicWithTicket: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$ticketPricing.sicWithTicket",
                                        as: "sicWithTicket",
                                        cond: {
                                            $and: [
                                                {
                                                    $lt: [
                                                        "$$sicWithTicket.fromDate",
                                                        new Date(date),
                                                    ],
                                                },
                                                {
                                                    $gt: ["$$sicWithTicket.toDate", new Date(date)],
                                                }, // Less than toDate
                                                { $ne: ["$$sicWithTicket.adultPrice", null] },
                                                { $ne: ["$$sicWithTicket.childPrice", null] },
                                            ],
                                        },
                                    },
                                },

                                0,
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        privateTransferTicket: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$ticketPricing.privateTransfer",
                                        as: "privateTransfer",
                                        cond: {
                                            $and: [
                                                {
                                                    $lt: [
                                                        "$$privateTransfer.fromDate",
                                                        new Date(date),
                                                    ],
                                                },
                                                {
                                                    $gt: [
                                                        "$$privateTransfer.toDate",
                                                        new Date(date),
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                                0,
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        sicPrice: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$transferPricing.sicPrice",
                                        as: "sicPrice",
                                        cond: {
                                            $and: [
                                                {
                                                    $lt: ["$$sicPrice.fromDate", new Date(date)],
                                                },
                                                {
                                                    $gt: ["$$sicPrice.toDate", new Date(date)],
                                                }, // Less than toDate
                                                { $ne: ["$$sicPrice.price", null] },
                                            ],
                                        },
                                    },
                                },

                                0,
                            ],
                        },
                    },
                },

                {
                    $addFields: {
                        privateTransfer: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$transferPricing.privateTransfer",
                                        as: "privateTransfer",
                                        cond: {
                                            $and: [
                                                {
                                                    $lt: [
                                                        "$$privateTransfer.fromDate",
                                                        new Date(date),
                                                    ],
                                                },
                                                {
                                                    $gt: [
                                                        "$$privateTransfer.toDate",
                                                        new Date(date),
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                                0,
                            ],
                        },
                    },
                },

                {
                    $lookup: {
                        from: "vehicletypes", // Replace with your actual vehicles collection name
                        localField: "privateTransferTicket.vehicleType.vehicle",
                        foreignField: "_id",
                        as: "vehicleTicketDetails",
                    },
                },
                {
                    $addFields: {
                        ticketVehicleType: {
                            $map: {
                                input: "$privateTransferTicket.vehicleType",
                                as: "vehicleType",
                                in: {
                                    $mergeObjects: [
                                        "$$vehicleType",
                                        {
                                            vehicle: {
                                                $arrayElemAt: [
                                                    "$vehicleTicketDetails",
                                                    {
                                                        $indexOfArray: [
                                                            "$vehicleTicketDetails._id",
                                                            "$$vehicleType.vehicle",
                                                        ],
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
                {
                    $lookup: {
                        from: "vehicletypes", // Replace with your actual vehicles collection name
                        localField: "privateTransfer.vehicleType.vehicle",
                        foreignField: "_id",
                        as: "vehicleTransferDetails",
                    },
                },
                {
                    $addFields: {
                        transferVehicleType: {
                            $map: {
                                input: "$privateTransfer.vehicleType",
                                as: "vehicleType",
                                in: {
                                    $mergeObjects: [
                                        "$$vehicleType",
                                        {
                                            vehicle: {
                                                $arrayElemAt: [
                                                    "$vehicleTransferDetails",
                                                    {
                                                        $indexOfArray: [
                                                            "$vehicleTransferDetails._id",
                                                            "$$vehicleType.vehicle",
                                                        ],
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        ticketOnlyPricing: {
                            $or: [{ $ifNull: ["$ticketPrice", false] }],
                        },
                    },
                },
                {
                    $addFields: {
                        ticketSharedPricing: {
                            $or: [{ $ifNull: ["$sicWithTicket", false] }],
                        },
                    },
                },
                {
                    $addFields: {
                        transferSharedPricing: {
                            $or: [{ $ifNull: ["$sicPrice", false] }],
                        },
                    },
                },
                {
                    $sort: { carouselPosition: 1 },
                },
                {
                    $project: {
                        attraction: 1,
                        activityId: 1,
                        isQuotation: 1,
                        name: 1,
                        excursionType: 1,
                        ticketOnlyPricing: 1,
                        ticketSharedPricing: 1,
                        transferSharedPricing: 1,
                        ticketVehicleType: 1,
                        transferVehicleType: 1,
                        image: 1,
                    },
                },
            ]);

            res.status(200).json(excursions);
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    getExcursionsSearchList: async (req, res) => {
        try {
            const { date, text } = req.query;
            let filter1 = {};

            console.log(date, "date");

            if (text && text !== "") {
                filter1["activity.name"] = { $regex: text, $options: "i" };
            }
            const excursions = await Excursion.aggregate([
                {
                    $match: {
                        isQuotation: true,
                        // isCarousel: true,
                    },
                },
                {
                    $lookup: {
                        from: "attractionactivities", // Replace 'vehiclecollection' with the actual name of your vehicle collection
                        localField: "activityId",
                        foreignField: "_id",
                        as: "activity",
                    },
                },
                {
                    $match: filter1,
                },
                {
                    $lookup: {
                        from: "attractions", // Replace 'vehiclecollection' with the actual name of your vehicle collection
                        localField: "activity.attraction",
                        foreignField: "_id",
                        as: "attraction",
                    },
                },
                {
                    $lookup: {
                        from: "excursiontransferpricings", // Replace 'vehiclecollection' with the actual name of your vehicle collection
                        localField: "transferPricing",
                        foreignField: "_id",
                        as: "transferPricing",
                    },
                },
                {
                    $lookup: {
                        from: "excursionticketpricings", // Replace 'vehiclecollection' with the actual name of your vehicle collection
                        localField: "ticketPricing",
                        foreignField: "_id",
                        as: "ticketPricing",
                    },
                },
                {
                    $set: {
                        attraction: {
                            $arrayElemAt: ["$attraction.title", 0],
                        },
                        ticketPricing: {
                            $arrayElemAt: ["$ticketPricing", 0],
                        },
                        transferPricing: {
                            $arrayElemAt: ["$transferPricing", 0],
                        },
                        image: {
                            $arrayElemAt: ["$attraction.images", 0],
                        },
                        _id: {
                            $arrayElemAt: ["$activity._id", 0],
                        },
                        name: {
                            $arrayElemAt: ["$activity.name", 0],
                        },
                    },
                },

                {
                    $addFields: {
                        ticketPrice: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$ticketPricing.ticketPrice",
                                        as: "ticketPrice",
                                        cond: {
                                            $and: [
                                                { $lt: ["$$ticketPrice.fromDate", new Date(date)] },
                                                { $gt: ["$$ticketPrice.toDate", new Date(date)] },
                                                { $ne: ["$$ticketPrice.adultPrice", null] },
                                                { $ne: ["$$ticketPrice.childPrice", null] },
                                            ],
                                        },
                                    },
                                },
                                0, // Index 0 to get the first element
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        sicWithTicket: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$ticketPricing.sicWithTicket",
                                        as: "sicWithTicket",
                                        cond: {
                                            $and: [
                                                {
                                                    $lt: [
                                                        "$$sicWithTicket.fromDate",
                                                        new Date(date),
                                                    ],
                                                },
                                                {
                                                    $gt: ["$$sicWithTicket.toDate", new Date(date)],
                                                }, // Less than toDate
                                                { $ne: ["$$sicWithTicket.adultPrice", null] },
                                                { $ne: ["$$sicWithTicket.childPrice", null] },
                                            ],
                                        },
                                    },
                                },

                                0,
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        privateTransferTicket: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$ticketPricing.privateTransfer",
                                        as: "privateTransfer",
                                        cond: {
                                            $and: [
                                                {
                                                    $lt: [
                                                        "$$privateTransfer.fromDate",
                                                        new Date(date),
                                                    ],
                                                },
                                                {
                                                    $gt: [
                                                        "$$privateTransfer.toDate",
                                                        new Date(date),
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                                0,
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        sicPrice: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$transferPricing.sicPrice",
                                        as: "sicPrice",
                                        cond: {
                                            $and: [
                                                {
                                                    $lt: ["$$sicPrice.fromDate", new Date(date)],
                                                },
                                                {
                                                    $gt: ["$$sicPrice.toDate", new Date(date)],
                                                }, // Less than toDate
                                                { $ne: ["$$sicPrice.price", null] },
                                            ],
                                        },
                                    },
                                },

                                0,
                            ],
                        },
                    },
                },

                {
                    $addFields: {
                        privateTransfer: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$transferPricing.privateTransfer",
                                        as: "privateTransfer",
                                        cond: {
                                            $and: [
                                                {
                                                    $lt: [
                                                        "$$privateTransfer.fromDate",
                                                        new Date(date),
                                                    ],
                                                },
                                                {
                                                    $gt: [
                                                        "$$privateTransfer.toDate",
                                                        new Date(date),
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                                0,
                            ],
                        },
                    },
                },

                {
                    $lookup: {
                        from: "vehicletypes", // Replace with your actual vehicles collection name
                        localField: "privateTransferTicket.vehicleType.vehicle",
                        foreignField: "_id",
                        as: "vehicleTicketDetails",
                    },
                },
                {
                    $addFields: {
                        ticketVehicleType: {
                            $map: {
                                input: "$privateTransferTicket.vehicleType",
                                as: "vehicleType",
                                in: {
                                    $mergeObjects: [
                                        "$$vehicleType",
                                        {
                                            vehicle: {
                                                $arrayElemAt: [
                                                    "$vehicleTicketDetails",
                                                    {
                                                        $indexOfArray: [
                                                            "$vehicleTicketDetails._id",
                                                            "$$vehicleType.vehicle",
                                                        ],
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
                {
                    $lookup: {
                        from: "vehicletypes", // Replace with your actual vehicles collection name
                        localField: "privateTransfer.vehicleType.vehicle",
                        foreignField: "_id",
                        as: "vehicleTransferDetails",
                    },
                },
                {
                    $addFields: {
                        transferVehicleType: {
                            $map: {
                                input: "$privateTransfer.vehicleType",
                                as: "vehicleType",
                                in: {
                                    $mergeObjects: [
                                        "$$vehicleType",
                                        {
                                            vehicle: {
                                                $arrayElemAt: [
                                                    "$vehicleTransferDetails",
                                                    {
                                                        $indexOfArray: [
                                                            "$vehicleTransferDetails._id",
                                                            "$$vehicleType.vehicle",
                                                        ],
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        ticketOnlyPricing: {
                            $or: [{ $ifNull: ["$ticketPrice", false] }],
                        },
                    },
                },
                {
                    $addFields: {
                        ticketSharedPricing: {
                            $or: [{ $ifNull: ["$sicWithTicket", false] }],
                        },
                    },
                },
                {
                    $addFields: {
                        transferSharedPricing: {
                            $or: [{ $ifNull: ["$sicPrice", false] }],
                        },
                    },
                },

                {
                    $project: {
                        attraction: 1,
                        activityId: 1,
                        isQuotation: 1,
                        name: 1,
                        excursionType: 1,
                        ticketOnlyPricing: 1,
                        ticketSharedPricing: 1,
                        transferSharedPricing: 1,
                        ticketVehicleType: 1,
                        transferVehicleType: 1,
                        image: 1,
                    },
                },
            ]);

            res.status(200).json(excursions);
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },
};
