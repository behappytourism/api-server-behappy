const { sendErrorResponse } = require("../../../helpers");
const {
    Transfer,
    AttractionActivity,
    GroupArea,
    Excursion,
    VehicleType,
} = require("../../../models");
const Vehicle = require("../../../models/transfer/vehicle.model");

module.exports = {
    getTransfer: async (req, res) => {
        try {
            const { transferFrom, transferTo, transferType, noOfPax } = req.body;

            let transfer;

            if (transferType === "city-city") {
                let transferFromGroup = await GroupArea.find({
                    isDeleted: false,
                    areas: { $in: [transferFrom] },
                });
                let transferToGroup = await GroupArea.find({
                    isDeleted: false,
                    areas: { $in: [transferTo] },
                });

                for (let i = 0; i < transferFromGroup?.length; i++) {
                    for (let j = 0; j < transferToGroup?.length; j++) {
                        let transferFromId = transferFromGroup[i]?._id;
                        let transferToId = transferToGroup[j]?._id;

                        transfer = await Transfer.findOne({
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

                        if (transfer) {
                            break;
                        }
                    }

                    if (transfer) {
                        break;
                    }
                }
            } else if (transferType === "city-airport") {
                let transferFromGroup = await GroupArea.find({
                    isDeleted: false,
                    areas: { $in: [transferFrom] },
                });

                for (let i = 0; i < transferFromGroup?.length; i++) {
                    let transferFromId = transferFromGroup[i]?._id;
                    let transferToId = transferTo;

                    transfer = await Transfer.findOne({
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

                    if (transfer) {
                        break;
                    }
                }
            } else if (transferType === "airport-city") {
                let transferToGroup = await GroupArea.find({
                    isDeleted: false,
                    areas: { $in: [transferTo] },
                });

                for (let i = 0; i < transferToGroup?.length; i++) {
                    let transferFromId = transferFrom;
                    let transferToId = transferToGroup[i]?._id;

                    transfer = await Transfer.findOne({
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

                    if (transfer) {
                        break;
                    }
                }
            }

            if (!transfer) {
                return sendErrorResponse(
                    res,
                    500,
                    "Sorry, This transfer is not configured on the system. Please send us an email with the location details."
                ); // Add return statement here
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
                                    veh?.vehicle?._id?.toString() === vh?.vehicle?._id.toString()
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

    getExcursionTransfer: async (req, res) => {
        try {
            const { excursionId, noOfPax, date } = req.body;

            let excursion = await Excursion.findOne({ activityId: excursionId })
                .populate("ticketPricing")
                .populate("transferPricing");

            if (excursion.excursionType.toLowerCase() === "ticket") {
                let selectedDate = excursion?.ticketPricing?.privateTransfer?.find((pvt) => {
                    console.log(new Date(date), new Date(pvt?.fromDate));
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
                    selectedDate.vehicleType.map(async (obj) => {
                        const vehicleDetails = await VehicleType.findById(obj.vehicle);
                        if (vehicleDetails) {
                            // Combine the vehicle details with the original object
                            return {
                                ...obj,
                                vehicle: vehicleDetails,
                            };
                        }
                        // Handle the case where the vehicle with the given ID doesn't exist
                        return obj;
                    })
                );

                let sortedVehicle = selectedDate.vehicleType.sort(
                    (a, b) => a.vehicle.normalOccupancy - b.vehicle.normalOccupancy
                );

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
                                    vehicle: sortedVehicle[i].vehicle,
                                    count: 1,
                                };

                                vehicleType.push(newVehicle);
                                occupancyArray.push(sortedVehicle[i]?.vehicle?.normalOccupancy);
                                totalPaxCount -= sortedVehicle[i]?.vehicle?.normalOccupancy;
                            }
                        } else if (sortedVehicle.length === index) {
                            let newVehicle = {
                                price: sortedVehicle[i].price,
                                vehicle: sortedVehicle[i].vehicle,
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
                    ...(sortedVehicle?.filter(
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
                    selectedDate.vehicleType.map(async (obj) => {
                        const vehicleDetails = await VehicleType.findById(obj.vehicle);
                        if (vehicleDetails) {
                            // Combine the vehicle details with the original object
                            return {
                                ...obj,
                                vehicle: vehicleDetails,
                            };
                        }
                        // Handle the case where the vehicle with the given ID doesn't exist
                        return obj;
                    })
                );

                let sortedVehicle = selectedDate.vehicleType.sort(
                    (a, b) => a.vehicle.normalOccupancy - b.vehicle.normalOccupancy
                );

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
                                    vehicle: sortedVehicle[i].vehicle,
                                    count: 1,
                                };

                                vehicleType.push(newVehicle);
                                occupancyArray.push(sortedVehicle[i]?.vehicle?.normalOccupancy);
                                totalPaxCount -= sortedVehicle[i]?.vehicle?.normalOccupancy;
                            }
                        } else if (sortedVehicle.length === index) {
                            let newVehicle = {
                                price: sortedVehicle[i].price,
                                vehicle: sortedVehicle[i].vehicle,
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
                    ...(sortedVehicle?.filter(
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
};
