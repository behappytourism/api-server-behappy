const { sendMobileOtp } = require("../../../helpers");
const { GroupArea, Attraction, Airport, Transfer, Country } = require("../../../models");
const { Area } = require("../../../models/global");
const { Hotel } = require("../../../models/hotel");
const { generateUniqueString, formatDate } = require("../../../utils");
const {
    B2BTransferOrder,
    B2BAttractionOrder,
    B2BMarkupProfile,
    B2BOrder,
    B2BTransferOrderPayment,
    B2BClientTransferMarkup,
    B2BSubAgentTransferMarkup,
} = require("../../models");
const { attractionOrderCreateHelper } = require("../attraction/b2bAttractionOrderHelper");
const { MarketStrategy } = require("../../../admin/models");
const { Types, isValidObjectId } = require("mongoose");
const xl = require("excel4node");
const { B2BAttractionOrderPayment } = require("../../models/attraction");

const b2bTransferOrderCalculations = async ({ journeys, req }) => {
    try {
        let journeyArray = [];
        let totalNetFare = 0;
        let totalNetCost = 0;
        let totalProfit = 0;

        let profile = await B2BMarkupProfile.findOne({
            resellerId: req?.reseller?._id,
        });

        let market = await MarketStrategy.findOne({
            _id: req?.reseller?.marketStrategy,
        });
        for (let i = 0; i < journeys.length; i++) {
            let {
                transferType,
                pickupSuggestionType,
                pickupLocation,
                dropOffSuggestionType,
                dropOffLocation,
                pickupDate,
                pickupTime,
                returnDate,
                returnTime,
                noOfAdults,
                noOfChildrens,
                selectedVehicleTypes,
                selectedReturnVehicleTypes,
            } = journeys[i];

            let transferFromId;
            let transferToId;
            let transferFrom;
            let transferTo;
            let trips = [];
            let netPrice = 0;
            let netCost = 0;
            let profit = 0;
            let profileMarkup = 0;
            let marketMarkup = 0;
            let subAgentMarkup = 0;
            let clientMarkup = 0;

            if (pickupSuggestionType === "AREA") {
                transferFrom = await Area.findOne({ _id: pickupLocation }).lean();
                if (!transferFrom) {
                    throw new Error("area not found");
                }

                let transferFromGroup = await GroupArea.findOne({
                    isDeleted: false,
                    areas: { $in: [transferFrom?._id] },
                });

                if (!transferFromGroup) {
                    throw new Error("area not found in group");
                }

                transferFrom.name = transferFrom?.areaName;

                transferFromId = transferFromGroup._id;
            } else if (pickupSuggestionType === "HOTEL") {
                let hotel = await Hotel.findOne({ _id: pickupLocation });
                if (!hotel) {
                    throw new Error("hotel not found");
                }

                transferFrom = await Area.findOne({ _id: hotel?.area }).lean();
                if (!transferFrom) {
                    throw new Error("hotel area not found");
                }

                transferFrom.name = hotel?.hotelName;

                let transferFromGroup = await GroupArea.findOne({
                    isDeleted: false,
                    areas: { $in: [transferFrom?._id] },
                });

                if (!transferFromGroup) {
                    throw new Error("area not found in group");
                }

                transferFromId = transferFromGroup._id;
            } else if (pickupSuggestionType === "ATTRACTION") {
                let attraction = await Attraction.findOne({ _id: pickupLocation });
                if (!attraction) {
                    throw new Error("attraction not found");
                }

                transferFrom = await Area.findOne({ _id: attraction?.area }).lean();
                if (!transferFrom) {
                    throw new Error("attraction area not found");
                }

                transferFrom.name = attraction?.title;

                let transferFromGroup = await GroupArea.findOne({
                    isDeleted: false,
                    areas: { $in: [transferFrom?._id] },
                });

                if (!transferFromGroup) {
                    throw new Error("area not found in group");
                }

                transferFromId = transferFromGroup._id;
            } else if (pickupSuggestionType === "AIRPORT") {
                transferFromId = pickupLocation;
                transferFrom = await Airport.findOne({ _id: pickupLocation }).select(
                    "airportName place"
                );
            } else {
                throw new Error("suggestion  found in group");
            }

            if (dropOffSuggestionType === "AREA") {
                transferTo = await Area.findOne({ _id: dropOffLocation }).lean();
                if (!transferTo) {
                    throw new Error("area not found");
                }

                let transferToGroup = await GroupArea.findOne({
                    isDeleted: false,
                    areas: { $in: [transferTo?._id] },
                });

                if (!transferToGroup) {
                    throw new Error("area not found in group");
                }

                transferTo.name = transferTo?.areaName;

                transferToId = transferToGroup._id;
            } else if (dropOffSuggestionType === "HOTEL") {
                let hotel = await Hotel.findOne({ _id: dropOffLocation }).select("hotelName area");
                if (!hotel) {
                    throw new Error("hotel not found");
                }

                transferTo = await Area.findOne({ _id: hotel?.area }).lean();
                if (!transferTo) {
                    throw new Error("hotel area not found");
                }

                let transferToGroup = await GroupArea.findOne({
                    isDeleted: false,
                    areas: { $in: [transferTo?._id] },
                });

                if (!transferToGroup) {
                    throw new Error("area not found in group");
                }

                transferTo.name = hotel?.hotelName;

                transferToId = transferToGroup._id;
            } else if (dropOffSuggestionType === "ATTRACTION") {
                let attraction = await Attraction.findOne({ _id: dropOffLocation });

                transferTo = await Area.findOne({ _id: attraction?.area }).lean();
                if (!transferTo) {
                    throw new Error("attraction area not found");
                }

                let transferToGroup = await GroupArea.findOne({
                    isDeleted: false,
                    areas: { $in: [transferTo?._id] },
                });

                if (!transferToGroup) {
                    throw new Error("area not found in group");
                }

                transferTo.name = attraction?.title;

                transferToId = transferToGroup._id;
            } else if (dropOffSuggestionType === "AIRPORT") {
                transferToId = dropOffLocation;
                transferTo = await Airport.findOne({ _id: dropOffLocation }).select(
                    "airportName place"
                );
            } else {
                throw new Error("suggestion  found in group");
            }

            const transfers = await Transfer.findOne({
                transferFrom: transferFromId,
                transferTo: transferToId,
            })
                .populate({
                    path: "vehicleType.vehicle",
                    populate: {
                        path: "vehicleCategoryId",
                    },
                })
                .lean();

            if (!transfers) {
                throw new Error("transfer not found for this combination ");
            }

            let vehicleTypes = [];

            let tripPrice = 0;
            let markMarkup = market?.transfer?.find(
                (transfer) => transfer?.transferId?.toString() === transfers?._id?.toString()
            );

            let profMarkup = profile?.transfer?.find(
                (transfer) => transfer?.transferId?.toString() === transfers?._id.toString()
            );

            let cliMarkup = await B2BClientTransferMarkup.findOne({
                resellerId: req.reseller._id,
                transferId: transfers?._id,
                isDeleted: false,
            });

            let subAgnMarkup = await B2BSubAgentTransferMarkup.findOne({
                resellerId: req.reseller._id,
                transferId: transfers?._id,
                isDeleted: false,
            });

            for (let k = 0; k < selectedVehicleTypes.length; k++) {
                let vehicle = transfers?.vehicleType?.find(
                    (vehicleTy) =>
                        vehicleTy?.vehicle?._id?.toString() ===
                        selectedVehicleTypes[k]?.vehicle?.toString()
                );

                if (!vehicle) {
                    throw new Error("vehcile not found for this combination ");
                }

                let totalPrice = vehicle.price;
                let marketVehicle;
                let profileVehicle;
                let clientVehicle;
                let subAgentVehicle;

                if (markMarkup) {
                    marketVehicle = markMarkup?.vehicleType?.find((vehTy) => {
                        return vehTy?.vehicleId?.toString() === vehicle?.vehicle?._id?.toString();
                    });
                }

                if (profMarkup) {
                    profileVehicle = profMarkup?.vehicleType?.find((vehTy) => {
                        return vehTy?.vehicleId?.toString() === vehicle?.vehicle?._id?.toString();
                    });
                }
                if (subAgnMarkup && req?.reseller?.role.toString() === "sub-agent") {
                    subAgentVehicle = subAgnMarkup?.vehicleType?.find((vehTy) => {
                        return vehTy?.vehicleId?.toString() === vehicle?.vehicle?._id?.toString();
                    });
                }

                if (cliMarkup) {
                    clientVehicle = cliMarkup?.vehicleType?.find((vehTy) => {
                        return vehTy?.vehicleId?.toString() === vehicle?.vehicle?._id?.toString();
                    });
                }

                let marketMarkupTotal = 0;
                if (marketVehicle) {
                    let markup = 0;
                    if (marketVehicle?.markupType === "flat") {
                        markup = Number(marketVehicle?.markup);
                    } else {
                        markup = (Number(marketVehicle?.markup) * Number(totalPrice)) / 100;
                    }
                    totalPrice += Number(markup);
                    marketMarkupTotal = Number(markup);
                }

                let profileMarkupTotal = 0;
                if (profileVehicle) {
                    let markup = 0;
                    if (profileVehicle.markupType === "flat") {
                        markup = Number(profileVehicle.markup);
                    } else {
                        markup = (Number(profileVehicle.markup) * Number(totalPrice)) / 100;
                    }
                    totalPrice += Number(markup);
                    profileMarkupTotal = Number(markup);
                }

                let subAgentMarkupTotal = 0;
                if (subAgentVehicle) {
                    let markup = 0;
                    if (subAgentVehicle.markupType === "flat") {
                        markup = Number(subAgentVehicle.markup);
                    } else {
                        markup = (Number(subAgentVehicle.markup) * Number(totalPrice)) / 100;
                    }
                    totalPrice += Number(markup);
                    subAgentMarkupTotal = Number(markup);
                }

                let clientMarkupTotal = 0;
                if (clientVehicle) {
                    let markup = 0;
                    if (clientVehicle?.markupType === "flat") {
                        markup = Number(clientVehicle.markup);
                    } else {
                        markup = (Number(clientVehicle.markup) * Number(totalPrice)) / 100;
                    }
                    totalPrice += Number(markup);
                    clientMarkupTotal = Number(markup);
                }

                vehicleTypes.push({
                    vehicleId: vehicle?.vehicle?._id,
                    name: vehicle?.vehicle?.name,
                    price: vehicle?.price,
                    count: selectedVehicleTypes[k]?.count,
                    occupancy:
                        pickupSuggestionType === "AIRPORT" || dropOffSuggestionType === "AIRPORT"
                            ? vehicle.vehicle.airportOccupancy
                            : pickupSuggestionType === "HOTEL" && dropOffSuggestionType !== "HOTEL"
                            ? vehicle.vehicle.airportOccupancy
                            : vehicle.vehicle.normalOccupancy,
                });

                marketMarkup += Number(marketMarkupTotal) * Number(selectedVehicleTypes[k]?.count);
                profileMarkup +=
                    Number(profileMarkupTotal) * Number(selectedVehicleTypes[k]?.count);
                subAgentMarkup +=
                    Number(subAgentMarkupTotal) * Number(selectedVehicleTypes[k]?.count);
                clientMarkup += Number(clientMarkupTotal) * Number(selectedVehicleTypes[k]?.count);

                profit +=
                    (Number(marketMarkupTotal) + Number(profileMarkupTotal)) *
                    Number(selectedVehicleTypes[k]?.count);
                netCost += Number(vehicle?.price) * Number(selectedVehicleTypes[k]?.count);
                netPrice +=
                    (Number(vehicle?.price) +
                        Number(clientMarkupTotal) +
                        Number(subAgentMarkupTotal) +
                        Number(profileMarkupTotal) +
                        Number(marketMarkupTotal)) *
                    Number(selectedVehicleTypes[k]?.count);

                tripPrice +=
                    (Number(vehicle?.price) +
                        Number(clientMarkupTotal) +
                        Number(subAgentMarkupTotal) +
                        Number(profileMarkupTotal) +
                        Number(marketMarkupTotal)) *
                    Number(selectedVehicleTypes[k]?.count);
            }

            trips.push({
                transfer: transfers?.transferType,
                suggestionType: `${pickupSuggestionType}-${dropOffSuggestionType}`,
                transferFrom,
                transferTo,
                pickupDate,
                pickupTime,
                vehicleTypes: vehicleTypes,
                tripPrice,
            });

            if (transferType === "return") {
                let pickupData = new Date(pickupDate + " " + pickupTime);
                let returnData = new Date(returnDate + " " + returnTime);

                let localDateString = returnData.toLocaleString();
                if (returnData < pickupData) {
                    throw new Error("return date should be after pickupDate ");
                }
                let transferFromId;
                let transferToId;
                let transferFrom;
                let transferTo;

                if (dropOffSuggestionType === "AREA") {
                    transferFrom = await Area.findOne({ _id: dropOffLocation }).lean();
                    if (!transferFrom) {
                        throw new Error("area not found");
                    }

                    let transferFromGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferFrom?._id] },
                    });

                    if (!transferFromGroup) {
                        throw new Error("area not found in group");
                    }

                    transferFrom.name = transferFrom?.areaName;

                    transferFromId = transferFromGroup._id;
                } else if (dropOffSuggestionType === "HOTEL") {
                    let hotel = await Hotel.findOne({ _id: dropOffLocation });
                    if (!hotel) {
                        throw new Error("hotel not found");
                    }

                    transferFrom = await Area.findOne({ _id: hotel?.area }).lean();
                    if (!transferFrom) {
                        throw new Error("area not found");
                    }

                    transferFrom.name = hotel?.hotelName;

                    let transferFromGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferFrom?._id] },
                    });

                    if (!transferFromGroup) {
                        throw new Error("area not found in group");
                    }

                    transferFromId = transferFromGroup._id;
                } else if (dropOffSuggestionType === "ATTRACTION") {
                    let attraction = await Attraction.findOne({ _id: dropOffLocation });

                    if (!attraction) {
                        throw new Error("hotel not found");
                    }

                    transferFrom = await Area.findOne({ _id: attraction?.area }).lean();
                    if (!transferFrom) {
                        throw new Error("area not found");
                    }

                    transferFrom.name = attraction?.title;

                    let transferFromGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferFrom?._id] },
                    });

                    if (!transferFrom) {
                        throw new Error("hotel area not found");
                    }

                    if (!transferFromGroup) {
                        throw new Error("area not found in group");
                    }

                    transferFromId = transferFromGroup._id;
                } else if (dropOffSuggestionType === "AIRPORT") {
                    transferFromId = dropOffLocation;
                    transferFrom = await Airport.findOne({ _id: dropOffLocation }).select(
                        "airportName place"
                    );
                } else {
                    throw new Error("suggestion  found in group");
                }

                if (pickupSuggestionType === "AREA") {
                    transferTo = await Area.findOne({ _id: pickupLocation }).lean();
                    if (!transferTo) {
                        throw new Error("area not found");
                    }

                    let transferToGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferTo?._id] },
                    });

                    if (!transferToGroup) {
                        throw new Error("area not found in group");
                    }

                    transferTo.name = transferTo?.areaName;

                    transferToId = transferToGroup._id;
                } else if (pickupSuggestionType === "HOTEL") {
                    let hotel = await Hotel.findOne({ _id: pickupLocation });
                    if (!hotel) {
                        throw new Error("hotel not found");
                    }

                    transferTo = await Area.findOne({ _id: hotel?.area }).lean();
                    if (!transferTo) {
                        throw new Error("hotel area not found");
                    }

                    let transferToGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferTo?._id] },
                    });

                    if (!transferToGroup) {
                        throw new Error("area not found in group");
                    }

                    transferTo.name = hotel?.hotelName;

                    transferToId = transferToGroup._id;
                } else if (pickupSuggestionType === "ATTRACTION") {
                    let attraction = await Attraction.findOne({ _id: pickupLocation });
                    if (!attraction) {
                        throw new Error("attraction area not found");
                    }
                    transferTo = await Area.findOne({ _id: attraction?.area }).lean();
                    if (!transferTo) {
                        throw new Error("attraction area not found");
                    }
                    let transferToGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferTo?._id] },
                    });

                    if (!transferToGroup) {
                        throw new Error("area not found in group");
                    }

                    transferTo.name = attraction?.title;

                    transferToId = transferToGroup._id;
                } else if (pickupSuggestionType === "AIRPORT") {
                    transferToId = pickupLocation;
                    transferTo = await Airport.findOne({ _id: pickupLocation }).select(
                        "airportName place"
                    );
                } else {
                    throw new Error("suggestion  found in group");
                }

                const transfers = await Transfer.findOne({
                    transferFrom: transferFromId,
                    transferTo: transferToId,
                })
                    .populate({
                        path: "vehicleType.vehicle",
                        populate: {
                            path: "vehicleCategoryId",
                        },
                    })
                    .lean();

                if (!transfers) {
                    throw new Error("transfer not found for this combination ");
                }

                let vehicleTypes = [];

                let tripPrice = 0;

                let markMarkup = market?.transfer?.find(
                    (transfer) => transfer?.transferId?.toString() === transfers?._id?.toString()
                );

                let profMarkup = profile?.transfer?.find(
                    (transfer) => transfer?.transferId?.toString() === transfers?._id.toString()
                );

                let cliMarkup = await B2BClientTransferMarkup.findOne({
                    resellerId: req.reseller._id,
                    transferId: transfers?._id,
                    isDeleted: false,
                });

                let subAgnMarkup = await B2BSubAgentTransferMarkup.findOne({
                    resellerId: req.reseller._id,
                    transferId: transfers?._id,
                    isDeleted: false,
                });

                for (let k = 0; k < selectedVehicleTypes.length; k++) {
                    let vehicle = transfers?.vehicleType?.find(
                        (vehicleTy) =>
                            vehicleTy?.vehicle?._id?.toString() ===
                            selectedVehicleTypes[k]?.vehicle?.toString()
                    );

                    if (!vehicle) {
                        throw new Error("vehcile not found for this combination ");
                    }

                    let totalPrice = vehicle.price;
                    let marketVehicle;
                    let profileVehicle;
                    let clientVehicle;
                    let subAgentVehicle;

                    if (markMarkup) {
                        marketVehicle = markMarkup?.vehicleType?.find((vehTy) => {
                            return (
                                vehTy?.vehicleId?.toString() === vehicle?.vehicle?._id?.toString()
                            );
                        });
                    }

                    if (profMarkup) {
                        profileVehicle = profMarkup?.vehicleType?.find((vehTy) => {
                            return (
                                vehTy?.vehicleId?.toString() === vehicle?.vehicle?._id?.toString()
                            );
                        });
                    }
                    if (subAgnMarkup && req?.reseller?.role.toString() === "sub-agent") {
                        subAgentVehicle = subAgnMarkup?.vehicleType?.find((vehTy) => {
                            return (
                                vehTy?.vehicleId?.toString() === vehicle?.vehicle?._id?.toString()
                            );
                        });
                    }

                    if (cliMarkup) {
                        clientVehicle = cliMarkup?.vehicleType?.find((vehTy) => {
                            return (
                                vehTy?.vehicleId?.toString() === vehicle?.vehicle?._id?.toString()
                            );
                        });
                    }

                    let marketMarkupTotal = 0;
                    if (marketVehicle) {
                        let markup = 0;
                        if (marketVehicle?.markupType === "flat") {
                            markup = Number(marketVehicle?.markup);
                        } else {
                            markup = (Number(marketVehicle?.markup) * Number(totalPrice)) / 100;
                        }
                        totalPrice += Number(markup);
                        marketMarkupTotal = Number(markup);
                    }

                    let profileMarkupTotal = 0;
                    if (profileVehicle) {
                        let markup = 0;
                        if (profileVehicle.markupType === "flat") {
                            markup = Number(profileVehicle.markup);
                        } else {
                            markup = (Number(profileVehicle.markup) * Number(totalPrice)) / 100;
                        }
                        totalPrice += Number(markup);
                        profileMarkupTotal = Number(markup);
                    }

                    let subAgentMarkupTotal = 0;
                    if (subAgentVehicle) {
                        let markup = 0;
                        if (subAgentVehicle.markupType === "flat") {
                            markup = Number(subAgentVehicle.markup);
                        } else {
                            markup = (Number(subAgentVehicle.markup) * Number(totalPrice)) / 100;
                        }
                        totalPrice += Number(markup);
                        subAgentMarkupTotal = Number(markup);
                    }

                    let clientMarkupTotal = 0;
                    if (clientVehicle) {
                        let markup = 0;
                        if (clientVehicle?.markupType === "flat") {
                            markup = Number(clientVehicle.markup);
                        } else {
                            markup = (Number(clientVehicle.markup) * Number(totalPrice)) / 100;
                        }
                        totalPrice += Number(markup);
                        clientMarkupTotal = Number(markup);
                    }

                    vehicleTypes.push({
                        vehicleId: vehicle?.vehicle?._id,
                        name: vehicle?.vehicle?.name,
                        price: vehicle?.price,
                        count: selectedVehicleTypes[k]?.count,
                        occupancy:
                            pickupSuggestionType === "AIRPORT" ||
                            dropOffSuggestionType === "AIRPORT"
                                ? vehicle.vehicle.airportOccupancy
                                : pickupSuggestionType === "HOTEL" &&
                                  dropOffSuggestionType !== "HOTEL"
                                ? vehicle.vehicle.airportOccupancy
                                : vehicle.vehicle.normalOccupancy,
                    });

                    marketMarkup +=
                        Number(marketMarkupTotal) * Number(selectedVehicleTypes[k]?.count);
                    profileMarkup +=
                        Number(profileMarkupTotal) * Number(selectedVehicleTypes[k]?.count);
                    subAgentMarkup +=
                        Number(subAgentMarkupTotal) * Number(selectedVehicleTypes[k]?.count);
                    clientMarkup +=
                        Number(clientMarkupTotal) * Number(selectedVehicleTypes[k]?.count);

                    profit +=
                        (Number(marketMarkupTotal) + Number(profileMarkupTotal)) *
                        Number(selectedVehicleTypes[k]?.count);
                    netCost += Number(vehicle?.price) * Number(selectedVehicleTypes[k]?.count);
                    netPrice +=
                        (Number(vehicle?.price) +
                            Number(clientMarkupTotal) +
                            Number(subAgentMarkupTotal) +
                            Number(profileMarkupTotal) +
                            Number(marketMarkupTotal)) *
                        Number(selectedVehicleTypes[k]?.count);

                    tripPrice +=
                        (Number(vehicle?.price) +
                            Number(clientMarkupTotal) +
                            Number(subAgentMarkupTotal) +
                            Number(profileMarkupTotal) +
                            Number(marketMarkupTotal)) *
                        Number(selectedVehicleTypes[k]?.count);
                }

                trips.push({
                    transfer: transfers?.transferType,
                    suggestionType: `${dropOffSuggestionType}-${pickupSuggestionType}`,
                    transferFrom,
                    transferTo,
                    pickupDate: returnDate,
                    pickupTime: returnTime,
                    vehicleTypes,
                    tripPrice,
                });
            }

            journeyArray.push({
                noOfAdults: noOfAdults,
                noOfChildrens: noOfChildrens,
                totalPassengers: noOfChildrens + noOfAdults,
                transferType,
                trips,
                marketMarkup: Number(marketMarkup),
                profileMarkup: Number(profileMarkup),
                subAgentMarkup: Number(subAgentMarkup),
                clientMarkup: Number(clientMarkup),
                netPrice: Number(netPrice),
                netCost: Number(netCost),
                profit: Number(profit),
            });
            totalNetFare += Number(netPrice);
            totalNetCost += Number(netCost);
            totalProfit += Number(profit);
        }

        return {
            totalNetFare,
            totalNetCost,
            totalProfit,
            journeyArray,
        };
    } catch (err) {
        throw new Error(err);
    }
};
module.exports = {
    createB2bTransferOrder: async ({
        country,
        name,
        email,
        phoneNumber,
        journeys,
        paymentMethod,
        req,
        res,
        referenceNumber,
    }) => {
        try {
            const { totalNetFare, totalProfit, journeyArray, totalNetCost } =
                await b2bTransferOrderCalculations({ journeys, req });
            console.log(totalNetFare, totalNetCost, "total net cost ");

            const transferOrder = new B2BTransferOrder({
                reseller: req.reseller._id,
                country,
                name,
                email,
                phoneNumber,
                journey: journeyArray,
                totalNetFare: Number(totalNetFare),
                totalNetCost: Number(totalNetCost),
                totalProfit: Number(totalProfit),
                paymentState: "non-paid",
                status: "pending",
                otp: 12345,
                referenceNumber: referenceNumber,
            });
            await transferOrder.save();
            if (paymentMethod === "ccavenue") {
                const transferOrderPayment = await B2BTransferOrderPayment.create({
                    amount: totalNetFare,
                    orderId: transferOrder?._id,
                    paymentState: "pending",
                    resellerId: req.reseller?._id,
                    paymentMethod: "ccavenue",
                    paymentStateMessage: "",
                });
            }

            return {
                orderId: transferOrder?._id,
                price: Number(totalNetFare),
                cost: Number(totalNetCost),
                profit: Number(totalProfit),
            };
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    },

    createB2bAttractionOrder: async ({
        countryCode,
        name,
        email,
        country,
        phoneNumber,
        agentReferenceNumber,
        selectedActivities,
        paymentMethod,
        req,
        res,
        referenceNumber,
    }) => {
        try {
            let response;
            try {
                response = await attractionOrderCreateHelper({
                    ...req.body,
                    referenceNumber,
                    reseller: req.reseller,
                });
            } catch (err) {
                throw new Error(err);
            }

            // TODO:
            // update random otp option in attraction order

            const attractionOrder = new B2BAttractionOrder({
                activities: response?.selectedActivities,
                totalAmount: response?.totalAmount,
                reseller: req.reseller?._id,
                country,
                name,
                email,
                phoneNumber,
                orderStatus: "pending",
                paymentState: "non-paid",
                orderedBy: req.reseller.role,
                agentReferenceNumber,
                referenceNumber,
                orderType: "b2b-portal",
            });
            await attractionOrder.save();

            if (paymentMethod === "ccavenue") {
                const attractionOrderPayment = await B2BAttractionOrderPayment.create({
                    amount: response?.totalAmount,
                    orderId: attractionOrder?._id,
                    paymentState: "pending",
                    resellerId: req.reseller?._id,
                    paymentMethod: "ccavenue",
                    paymentStateMessage: "",
                });
            }

            return {
                orderId: attractionOrder._id,
                price: response?.totalAmount,
                cost: 0,
                profit: 0,
            };
        } catch (err) {
            throw new Error(err);
        }
    },
    geneB2bOrdersSheet: async ({
        skip = 0,
        limit = 10,
        bookingType,
        orderedBy,
        status,
        referenceNo,
        resellerId,
        agentCode,
        dateFrom,
        dateTo,
        travellerEmail,
        res,
        downloader,
    }) => {
        try {
            const filters1 = {};

            if (resellerId) {
                filters1.reseller = Types.ObjectId(resellerId);
            }

            if (referenceNo && referenceNo !== "") {
                filters1.referenceNumber = referenceNo;
            }

            if (orderedBy && orderedBy !== "") {
                filters1.orderedBy = orderedBy;
            }

            if (travellerEmail && travellerEmail !== "") {
                filters1.email = travellerEmail;
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filters1.$and = [
                    { createdAt: { $gte: new Date(dateFrom) } },
                    { createdAt: { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filters1["createdAt"] = {
                    $gte: new Date(dateFrom),
                };
            } else if (dateTo && dateTo !== "") {
                filters1["createdAt"] = { $lte: new Date(dateTo) };
            }

            const orders = await B2BOrder.find(filters1)
                .populate("reseller country")
                .select({
                    baseFare: 0,
                    profit: 0,
                })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet("Orders");

            const titleStyle = wb.createStyle({
                font: {
                    bold: true,
                },
            });

            ws.cell(1, 1).string("Ref No").style(titleStyle);
            ws.cell(1, 2).string("Ordered By").style(titleStyle);
            ws.cell(1, 3).string("Purchase Date").style(titleStyle);
            ws.cell(1, 4).string("Traveller Name").style(titleStyle);
            ws.cell(1, 5).string("Traveller Email").style(titleStyle);
            ws.cell(1, 6).string("Traveller Country").style(titleStyle);
            ws.cell(1, 7).string("Traveller Phone Number").style(titleStyle);
            ws.cell(1, 8).string("Price").style(titleStyle);
            ws.cell(1, 10).string("Status").style(titleStyle);

            for (let i = 0; i < orders.length; i++) {
                const order = orders[i];
                ws.cell(i + 2, 1).string(order?.referenceNumber || "N/A");
                ws.cell(i + 2, 2).string(order?.reseller?.companyName || "N/A");
                ws.cell(i + 2, 3).string(order?.createdAt ? formatDate(order?.createdAt) : "N/A");
                ws.cell(i + 2, 4).string(order?.name || "N/A");
                ws.cell(i + 2, 5).string(order?.email || "N/A");
                ws.cell(i + 2, 6).string(order?.country?.countryName || "N/A");
                ws.cell(i + 2, 7).string(
                    order?.country?.phonecode + " " + order?.phoneNumber || "N/A"
                );
                ws.cell(i + 2, 8).number(Number(order?.netPrice) || 0);

                ws.cell(i + 2, 9).string(order?.orderStatus || "N/A");
            }

            wb.write(`FileName.xlsx`, res);
        } catch (err) {
            throw err;
        }
    },
    b2bTransferOrderCalculations,
};
