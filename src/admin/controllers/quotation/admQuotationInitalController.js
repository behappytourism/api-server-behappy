const { Types, isValidObjectId } = require("mongoose");
const { singleRoomTypeRate } = require("../../../b2b/helpers/quotation");
const { Reseller } = require("../../../b2b/models");
const { sendErrorResponse } = require("../../../helpers");
const {
    Airport,
    Excursion,
    Visa,
    VisaType,
    AttractionActivity,
    Transfer,
    GroupArea,
    VisaNationality,
    VehicleType,
    Guide,
} = require("../../../models");
const { City } = require("../../../models/global");

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
            // const cities = await City.find({ isDeleted: false }).sort({ createdAt: -1 });
            // const excursions = await AttractionActivity.find({ isDeleted: false })
            //     .sort({ createdAt: -1 })
            //     .populate("attraction", "title images")
            //     .populate("ticketPricing.vehicleType.vehicle", "name normalOccupancy")
            //     .populate("transferPricing.vehicleType.vehicle", "name normalOccupancy")
            //     .select(
            //         "name attraction qtnActivityType ticketPricing.vehicleType.transferPricing.vehicleType image"
            //     );

            const excursions = await AttractionActivity.aggregate([
                {
                    $match: {
                        qtnActivityType: { $exists: true },
                        isQuotation: true,
                        isDeleted: false,
                    },
                },
                {
                    $lookup: {
                        from: "attractions",
                        localField: "attraction",
                        foreignField: "_id",
                        as: "attraction",
                    },
                },
                {
                    $lookup: {
                        from: "vehicletypes",
                        localField: "ticketPricing.vehicleType.vehicle",
                        foreignField: "_id",
                        as: "ticketVehicleType",
                    },
                },
                {
                    $lookup: {
                        from: "vehicletypes",
                        localField: "transferPricing.vehicleType.vehicle",
                        foreignField: "_id",
                        as: "transferVehicleType",
                    },
                },
                {
                    $set: {
                        attraction: {
                            $arrayElemAt: ["$attraction.title", 0],
                        },
                        image: {
                            $arrayElemAt: [`$attraction.images`, 0],
                        },
                    },
                },
                {
                    $sort: { createdAt: -1 },
                },
                {
                    $project: {
                        name: 1,
                        attraction: 1,
                        qtnActivityType: 1,
                        ticketVehicleType: 1,
                        transferVehicleType: 1,
                        image: 1,
                        description: 1,
                        ticketPricing: 1,
                        transferPricing: 1,
                    },
                },
            ]);

            const visaCountry = await Visa.find({ isDeleted: false }).select("country").populate({
                path: "country",
                select: "countryName",
            });

            res.status(200).json({ airports, excursions, visaCountry });
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
                    visaName: visa.visaType.visaName,
                    adultPrice: visa.adultPrice,
                    childPrice: visa.childPrice,
                }));

            if (!visaTypes || visaTypes?.length < 1) {
                return sendErrorResponse(
                    res,
                    400,
                    "No visa added from this country . Please contact admin and add visa "
                );
            }

            res.status(200).json(visaTypes);
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    transferAvailable: async (req, res) => {
        try {
            const { transferFrom, transferTo, transferType, noOfPax } = req.body;

            let transferFromId;
            let transferToId;

            if (transferType === "city-city") {
                let transferFromGroup = await GroupArea.findOne({
                    isDeleted: false,
                    areas: { $in: [transferFrom] },
                });
                let transferToGroup = await GroupArea.findOne({
                    isDeleted: false,
                    areas: { $in: [transferTo] },
                });
                transferFromId = transferFromGroup?._id;
                transferToId = transferToGroup?._id;
            } else if (transferType === "city-airport") {
                let transferFromGroup = await GroupArea.findOne({
                    isDeleted: false,
                    areas: { $in: [transferFrom] },
                });
                transferFromId = transferFromGroup?._id;
                transferToId = transferTo;
            } else if (transferType === "airport-city") {
                let transferToGroup = await GroupArea.findOne({
                    isDeleted: false,
                    areas: { $in: [transferTo] },
                });

                transferFromId = transferFrom;
                transferToId = transferToGroup?._id;
            }

            const transfer = await Transfer.findOne({
                isDeleted: false,
                transferFrom: transferFromId,
                transferTo: transferToId,
                // transferType: transferType,
            }).populate({
                path: "vehicleType.vehicle",
                populate: {
                    path: "vehicleCategoryId",
                },
            });

            if (!transfer) {
                return sendErrorResponse(
                    res,
                    500,
                    "Sorry, This transfer is not configured on the system. Please send us an email with the location details."
                );
            }

            let totalPaxCount = noOfPax;
            let vehicleType = [];
            let occupancyArray = [];
            let vehicleArray = [];

            let vehicles = transfer.vehicleType.sort(
                (a, b) => a.vehicle.airportOccupancy - b.vehicle.airportOccupancy
            );

            let sortedVehicle = vehicles.filter(
                (veh) => veh?.vehicle?.vehicleCategoryId?.categoryName === "normal"
            );

            if (sortedVehicle?.length === 0) {
                sortedVehicle = vehicles;
            }

            while (totalPaxCount > 0) {
                let index = 1;
                for (let i = 0; i < sortedVehicle.length; i++) {
                    if (totalPaxCount <= 0) {
                        break;
                    }

                    if (sortedVehicle[i]?.vehicle?.airportOccupancy >= totalPaxCount) {
                        if (occupancyArray.includes(sortedVehicle[i]?.vehicle?.airportOccupancy)) {
                            let vehicleTp = vehicleType.find(
                                (vehicle) =>
                                    vehicle.vehicle?.airportOccupancy ===
                                    sortedVehicle[i]?.vehicle?.airportOccupancy
                            );
                            if (vehicleTp) {
                                vehicleTp.count += 1;
                            }

                            totalPaxCount -= sortedVehicle[i]?.vehicle?.airportOccupancy;

                            break;
                        } else {
                            let newVehicle = {
                                price: sortedVehicle[i].price,
                                vehicle: sortedVehicle[i].vehicle,
                                count: 1,
                            };

                            vehicleType.push(newVehicle);
                            occupancyArray.push(sortedVehicle[i]?.vehicle?.airportOccupancy);
                            totalPaxCount -= sortedVehicle[i]?.vehicle?.airportOccupancy;
                        }
                    } else if (sortedVehicle.length === index) {
                        let newVehicle = {
                            price: sortedVehicle[i].price,
                            vehicle: sortedVehicle[i].vehicle,
                            count: 1,
                        };

                        vehicleType.push(newVehicle);
                        occupancyArray.push(sortedVehicle[i]?.vehicle?.airportOccupancy);
                        totalPaxCount -= sortedVehicle[i]?.vehicle?.airportOccupancy;

                        break;
                    }

                    index++;
                }
            }

            vehicleArray = [
                ...vehicleType,
                ...(vehicles?.filter(
                    (vh) =>
                        vh?.vehicle?._id?.toString() !==
                        vehicleType
                            ?.find(
                                (veh) =>
                                    veh?.vehicle?._id?.toString() === vh?.vehicle?._id?.toString()
                            )
                            ?.vehicle?._id?.toString()
                ) || []),
            ];

            res.status(200).json(vehicleArray);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getResellersList: async (req, res) => {
        try {
            const { searchText } = req.query;

            const query = { isActive: false };

            // Check if searchText exists and add the $or operator to search by field name or agentCode
            if (searchText) {
                query.$or = [
                    { companyName: { $regex: searchText, $options: "i" } }, // Case-insensitive search on the fieldName field
                    // { agentCode: { $regex: Number(searchText), $options: "i" } }, // Case-insensitive search on the agentCode field
                ];
            }

            const resellers = await Reseller.find(query).limit(5);

            if (!resellers) {
                return sendErrorResponse(res, 400, "No Reseller found");
            }

            res.status(200).json({ resellers });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getExcursionTransfer: async (req, res) => {
        try {
            const { excursionId, noOfPax, date } = req.body;
            let excursion = await Excursion.findOne({ activityId: excursionId })
                .populate("ticketPricing")
                .populate("transferPricing");

            if (excursion.excursionType.toLowerCase() === "ticket") {
                let selectedDate = excursion?.ticketPricing?.privateTransfer?.find((pvt) => {
                    return (
                        new Date(date) >= new Date(pvt?.fromDate) &&
                        new Date(date) <= new Date(pvt?.toDate)
                    );
                });

                if (!selectedDate) {
                    return sendErrorResponse(
                        res,
                        400,
                        `no availabilty for excursion . please choose some other excursion`
                    );
                }
                if (!selectedDate.vehicleType || selectedDate.vehicleType.length < 0) {
                    return sendErrorResponse(res, 400, "No vehicle type found");
                }

                let totalPaxCount = noOfPax;
                let vehicleType = [];
                let occupancyArray = [];
                let vehicleArray = [];

                selectedDate.vehicleType = await Promise.all(
                    selectedDate.vehicleType.map(async (vehicleType) => {
                        const vehicle = await VehicleType.findOne({
                            _id: vehicleType.vehicle,
                        }).populate("vehicleCategoryId");

                        // Filter out items with null vehicle field
                        if (vehicle) {
                            return {
                                ...vehicleType,
                                vehicle: vehicle,
                            };
                        }

                        // If vehicle is null, filter it out
                        return null;
                    })
                );

                // Remove null entries from the array
                selectedDate.vehicleType = selectedDate.vehicleType.filter((item) => item !== null);

                let vehicles = selectedDate.vehicleType.sort(
                    (a, b) => a.vehicle.normalOccupancy - b.vehicle.normalOccupancy
                );

                let sortedVehicle = vehicles.filter(
                    (veh) => veh.vehicle.vehicleCategoryId.categoryName.toString() === "normal"
                );

                if (sortedVehicle?.length === 0) {
                    sortedVehicle = vehicles;
                }

                while (totalPaxCount > 0) {
                    let index = 1;
                    for (let i = 0; i < sortedVehicle.length; i++) {
                        if (totalPaxCount <= 0) {
                            break;
                        }

                        if (sortedVehicle[i]?.vehicle?.normalOccupancy >= totalPaxCount) {
                            if (
                                occupancyArray.includes(sortedVehicle[i]?.vehicle?.normalOccupancy)
                            ) {
                                let vehicleTp = vehicleType.find(
                                    (vehicle) =>
                                        vehicle.vehicle?.normalOccupancy ===
                                        sortedVehicle[i]?.vehicle?.normalOccupancy
                                );
                                if (vehicleTp) {
                                    vehicleTp.count += 1;
                                }

                                totalPaxCount -= sortedVehicle[i]?.vehicle?.normalOccupancy;

                                break;
                            } else {
                                let newVehicle = {
                                    price: sortedVehicle[i].price,
                                    vehicle: sortedVehicle[i].vehicle._id,
                                    count: 1,
                                };

                                vehicleType.push(newVehicle);
                                occupancyArray.push(sortedVehicle[i]?.vehicle?.normalOccupancy);
                                totalPaxCount -= sortedVehicle[i]?.vehicle?.normalOccupancy;
                            }
                        } else if (sortedVehicle.length === index) {
                            let newVehicle = {
                                price: sortedVehicle[i].price,
                                vehicle: sortedVehicle[i].vehicle._id,
                                count: 1,
                            };

                            vehicleType.push(newVehicle);
                            occupancyArray.push(sortedVehicle[i]?.vehicle?.normalOccupancy);
                            totalPaxCount -= sortedVehicle[i]?.vehicle?.normalOccupancy;

                            break;
                        }

                        index++;
                    }
                }

                vehicleArray = [
                    ...vehicleType,
                    ...(vehicles?.filter(
                        (vh) =>
                            vh?.vehicle?._id?.toString() !==
                            vehicleType
                                ?.find(
                                    (veh) =>
                                        veh?.vehicle?._id?.toString() ===
                                        vh?.vehicle?._id?.toString()
                                )
                                ?.vehicle?._id?.toString()
                    ) || []),
                ];

                res.status(200).json(vehicleArray);
            } else {
                let selectedDate = excursion?.transferPricing?.privateTransfer?.find((pvt) => {
                    return (
                        new Date(date) >= new Date(pvt?.fromDate) &&
                        new Date(date) <= new Date(pvt?.toDate)
                    );
                });

                if (!selectedDate) {
                    return sendErrorResponse(
                        res,
                        400,
                        `no availabilty for excursion . please choose some other excursion`
                    );
                }

                if (!selectedDate.vehicleType || selectedDate.vehicleType.length < 0) {
                    return sendErrorResponse(res, 400, "No vehicle type found");
                }

                let totalPaxCount = noOfPax;
                let vehicleType = [];
                let occupancyArray = [];
                let vehicleArray = [];

                selectedDate.vehicleType = await Promise.all(
                    selectedDate.vehicleType.map(async (vehicleType) => {
                        const vehicle = await VehicleType.findOne({
                            _id: vehicleType.vehicle,
                        }).populate("vehicleCategoryId");

                        // Filter out items with null vehicle field
                        if (vehicle) {
                            return {
                                ...vehicleType,
                                vehicle: vehicle,
                            };
                        }

                        // If vehicle is null, filter it out
                        return null;
                    })
                );

                // Remove null entries from the array
                selectedDate.vehicleType = selectedDate.vehicleType.filter((item) => item !== null);

                let vehicles = selectedDate.vehicleType.sort(
                    (a, b) => a.vehicle.normalOccupancy - b.vehicle.normalOccupancy
                );

                let sortedVehicle = vehicles.filter(
                    (veh) => veh.vehicle.vehicleCategoryId.categoryName.toString() === "normal"
                );

                if (sortedVehicle?.length === 0) {
                    sortedVehicle = vehicles;
                }

                while (totalPaxCount > 0) {
                    let index = 1;
                    for (let i = 0; i < sortedVehicle.length; i++) {
                        if (totalPaxCount <= 0) {
                            break;
                        }

                        if (sortedVehicle[i]?.vehicle?.normalOccupancy >= totalPaxCount) {
                            if (
                                occupancyArray.includes(sortedVehicle[i]?.vehicle?.normalOccupancy)
                            ) {
                                let vehicleTp = vehicleType.find(
                                    (vehicle) =>
                                        vehicle.vehicle?.normalOccupancy ===
                                        sortedVehicle[i]?.vehicle?.normalOccupancy
                                );
                                if (vehicleTp) {
                                    vehicleTp.count += 1;
                                }

                                totalPaxCount -= sortedVehicle[i]?.vehicle?.normalOccupancy;

                                break;
                            } else {
                                let newVehicle = {
                                    price: sortedVehicle[i].price,
                                    vehicle: sortedVehicle[i].vehicle._id,
                                    count: 1,
                                };

                                vehicleType.push(newVehicle);
                                occupancyArray.push(sortedVehicle[i]?.vehicle?.normalOccupancy);
                                totalPaxCount -= sortedVehicle[i]?.vehicle?.normalOccupancy;
                            }
                        } else if (sortedVehicle.length === index) {
                            let newVehicle = {
                                price: sortedVehicle[i].price,
                                vehicle: sortedVehicle[i].vehicle._id,
                                count: 1,
                            };

                            vehicleType.push(newVehicle);
                            occupancyArray.push(sortedVehicle[i]?.vehicle?.normalOccupancy);
                            totalPaxCount -= sortedVehicle[i]?.vehicle?.normalOccupancy;

                            break;
                        }

                        index++;
                    }
                }

                vehicleArray = [
                    ...vehicleType,
                    ...(vehicles?.filter(
                        (vh) =>
                            vh?.vehicle?._id.toString() !==
                            vehicleType
                                ?.find(
                                    (veh) =>
                                        veh?.vehicle?._id.toString() === vh.vehicle._id.toString()
                                )
                                ?.vehicle?._id.toString()
                    ) || []),
                ];

                res.status(200).json(vehicleArray);
            }
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    getExcursionsList: async (req, res) => {
        try {
            const { text, date, value = "all" } = req.query;
            let filter1 = {};

            if (text && text !== "") {
                filter1["activity.name"] = { $regex: text, $options: "i" };
            }
            let filter2;

            if (value === "all") {
                filter2 = {
                    $match: {
                        ticketPrice: { $exists: true, $ne: null },
                    },
                };
            } else if (value === "shared") {
                filter2 = {
                    $match: {
                        $or: [
                            { sicPrice: { $exists: true, $ne: null } },
                            { sicWithTicket: { $exists: true, $ne: null } },
                        ],
                    },
                };
            } else if (value === "private") {
                filter2 = {
                    $match: {
                        $or: [
                            {
                                $and: [
                                    {
                                        "privateTransfer.vehicleType": {
                                            $exists: true,
                                            $ne: null,
                                            $not: { $size: 0 },
                                        },
                                    },
                                    { privateTransfer: { $exists: true } },
                                ],
                            },
                            {
                                $and: [
                                    {
                                        "privateTransferTicket.vehicleType": {
                                            $exists: true,
                                            $ne: null,
                                            $not: { $size: 0 },
                                        },
                                    },
                                    { privateTransferTicket: { $exists: true } },
                                ],
                            },
                        ],
                    },
                };
            }

            const excursions = await Excursion.aggregate([
                {
                    $match: {
                        isQuotation: true,
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
                    $set: {
                        activity: {
                            $arrayElemAt: ["$activity", 0],
                        },
                    },
                },

                {
                    $match: filter1,
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
                        ticketPricing: {
                            $arrayElemAt: ["$ticketPricing", 0],
                        },
                        transferPricing: {
                            $arrayElemAt: ["$transferPricing", 0],
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
                        "privateTransferTicket.vehicleType": {
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
                        "privateTransfer.vehicleType": {
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
                    $project: {
                        activityId: 1,
                        isQuotation: 1,
                        activity: {
                            name: 1,
                        },
                        excursionType: 1,
                        sicPrice: {
                            $cond: {
                                if: { $eq: ["$excursionType", "ticket"] },
                                then: "$$REMOVE",
                                else: "$sicPrice",
                            },
                        },
                        ticketPrice: 1,
                        sicWithTicket: 1,
                        privateTransfer: {
                            $cond: {
                                if: { $eq: ["$excursionType", "ticket"] },
                                then: "$$REMOVE",
                                else: "$privateTransfer",
                            },
                        },
                        privateTransferTicket: 1,
                        vehicleTicketDetails: 1,
                    },
                },
                filter2,
            ]);

            res.status(200).json(excursions);
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    getGudesList: async (req, res) => {
        try {
            const { text, date } = req.query;
            let filter1 = { isDeleted: false };

            if (text && text !== "") {
                filter1["name"] = { $regex: text, $options: "i" };
            }
            let filter2;

            filter2 = {
                $match: {
                    prices: { $exists: true, $ne: null },
                },
            };

            const guides = await Guide.aggregate([
                {
                    $match: filter1,
                },
                {
                    $addFields: {
                        prices: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$pricing",
                                        as: "guidePrice",
                                        cond: {
                                            $and: [
                                                // { $lt: ["$$guidePrice.fromDate", new Date(date)] },
                                                // { $gt: ["$$guidePrice.toDate", new Date(date)] },
                                                // { $ne: ["$$guidePrice.price", null] },
                                            ],
                                        },
                                    },
                                },
                                0, // Index 0 to get the first element
                            ],
                        },
                    },
                },
                filter2,
                {
                    $project: {
                        name: 1,
                        duration: 1,
                        prices: 1,
                    },
                },
            ]);

            res.status(200).json(guides);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
