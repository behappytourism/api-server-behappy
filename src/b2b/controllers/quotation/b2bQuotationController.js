const { Types, isValidObjectId } = require("mongoose");
const { MarketStrategy } = require("../../../admin/models");
const { sendErrorResponse } = require("../../../helpers");
const sentQuotationEmail = require("../../../helpers/quotaion/quotationEmail");
const senQuotationEmail = require("../../../helpers/quotaion/quotationEmail");
const {
    ExcursionQuotation,
    ExcSupplementsQuotation,
    Visa,
    TransferQuotation,
    HotelQuotation,
    QuotationAmendment,
    VisaType,
    VehicleType,
    AttractionActivity,
    Quotation,
    Transfer,
    Airport,
    GroupArea,
    VisaNationality,
    AdminB2bAccess,
    Excursion,
} = require("../../../models");

const { Area, City } = require("../../../models/global");
const { Hotel } = require("../../../models/hotel");
const Vehicle = require("../../../models/transfer/vehicle.model");
const { singleRoomTypeRate, createQtnSheet, createPdf } = require("../../helpers/quotation");
const { B2BMarkupProfile } = require("../../models");

module.exports = {
    createQuotation: async (req, res) => {
        try {
            const {
                clientName,
                noOfAdults,
                noOfChildren,
                agentQuotationNumber,
                childrenAges,
                checkInDate,
                checkOutDate,
                paxType,
                arrivalAirport,
                departureAirport,
                isArrivalAirportDisabled,
                isDepartureAirportDisabled,
                isHotelQuotationDisabled,
                isSupplimentQuotationDisabled,
                isExcursionQuotationDisabled,
                stays,
                isTransferQuotationDisabled,
                transfer,
                isVisaQuotationDisabled,
                visaId,
                selectedExcursionType,
                selectedExcursionTypeSuppliments,
                otbPrice,
                hotelDisabledRemark,
                isAlreadyBooked,
                isResellerDisabled = false,
                quotationCurrency = "AED",
                departureTerminalId,
                departureTerminalCode,
                arrivalTerminalId,
                arrivalTerminalCode,
                selectedVisaNationality,
                isCustomMarkup = false,
                pickupPlaceId,
                pickupNote,
            } = req.body;

            if (!noOfAdults) {
                return sendErrorResponse(res, 400, "no of adults is required");
            }

            if (Number(noOfAdults) < 1) {
                return sendErrorResponse(
                    res,
                    400,
                    "No of adults should be greater than or equal to 1"
                );
            }

            if (noOfChildren && Number(noOfChildren) < 1) {
                return sendErrorResponse(
                    res,
                    400,
                    "No of children should be greater than or equal to 1"
                );
            }

            let totalPax =
                (noOfAdults ? Number(noOfAdults) : 0) + (noOfChildren ? Number(noOfChildren) : 0);

            if (totalPax <= 0) {
                return sendErrorResponse(
                    res,
                    400,
                    "The total no of pax should be greater than or equal to one"
                );
            }

            const formattedCheckInDate = new Date(checkInDate).toISOString().substring(0, 10);
            const formattedCheckOutDate = new Date(checkOutDate).toISOString().substring(0, 10);

            if (!formattedCheckOutDate || !formattedCheckInDate) {
                return sendErrorResponse(res, 400, "checkin and checkout is required");
            }

            const diffTime = Math.abs(
                new Date(formattedCheckOutDate) - new Date(formattedCheckInDate)
            );
            const noOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (noOfNights < 1) {
                return sendErrorResponse(
                    res,
                    400,
                    "number of nights should be greater than or equal to one"
                );
            }

            let arrivalAirportDetails;
            if (isArrivalAirportDisabled === false) {
                arrivalAirportDetails = await Airport.findById(arrivalAirport);

                if (!arrivalAirportDetails) {
                    return sendErrorResponse(res, 400, "arrival airport details not found");
                }
            }

            let departureAirportDetails;
            if (isDepartureAirportDisabled === false) {
                departureAirportDetails = await Airport.findById(departureAirport);

                if (!departureAirportDetails) {
                    return sendErrorResponse(res, 400, "arrival airport details not found");
                }
            }

            let profileMarkup;
            let market = req?.reseller?.marketStrategy;

            let profile = await B2BMarkupProfile.findOne({ resellerId: req.reseller._id });

            if (profile && profile?.quotation) {
                profileMarkup = profile;
            }

            let excursionAdultTotal = 0;
            let excursionChildTotal = 0;
            let excursionPvtTransferTotal = 0;
            let excursionAdultTotalCost = 0;
            let excursionChildTotalCost = 0;
            let totalPvtTransferTotalCost = 0;
            let adultMarketMarkupTotal = 0;
            let childMarketMarkupTotal = 0;
            let pvtTransferMarketMarkupTotal = 0;
            let adultProfileMarkupTotal = 0;
            let childProfileMarkupTotal = 0;
            let pvtTransferProfileMarkupTotal = 0;

            let excursionQuotation;

            if (isExcursionQuotationDisabled === false) {
                if (selectedExcursionType?.length > 0) {
                    const filteredExcursions = selectedExcursionType?.filter((item) => {
                        if (item?.excursionId && item?.value) {
                            return item;
                        }
                        return "";
                    });

                    if (filteredExcursions?.length > 0) {
                        for (let i = 0; i < filteredExcursions?.length; i++) {
                            let excursionAdultCost = 0;
                            let excursionChildCost = 0;
                            let pvtTransferCost = 0;

                            const excursions = await Excursion.aggregate([
                                {
                                    $match: {
                                        activityId: Types.ObjectId(
                                            filteredExcursions[i]?.excursionId
                                        ),
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
                                        activity: {
                                            $arrayElemAt: ["$activity", 0],
                                        },
                                    },
                                },
                            ]);

                            let excursion = excursions[0];

                            if (!excursion) {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "You selected an invalid excursion. Please double check and try again"
                                );
                            }

                            const vehicleType = filteredExcursions[i].vehicleType;

                            let transferType = "without";

                            if (
                                excursion?.excursionType === "transfer" &&
                                filteredExcursions[i]?.value.toLowerCase() === "private"
                            ) {
                                if (vehicleType && vehicleType.length < 1) {
                                    return sendErrorResponse(
                                        res,
                                        400,
                                        `please select a transfer type in ${excursion?.name}`
                                    );
                                }

                                for (let j = 0; j < vehicleType.length; j++) {
                                    let selectedDate =
                                        excursion?.transferPricing?.privateTransfer?.find((pvt) => {
                                            return (
                                                new Date(checkInDate) >= new Date(pvt?.fromDate) &&
                                                new Date(checkInDate) <= new Date(pvt?.toDate)
                                            );
                                        });

                                    if (!selectedDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                        );
                                    }

                                    const selectedVehicleType = selectedDate?.vehicleType?.find(
                                        (vehTY) => {
                                            return (
                                                vehTY?.vehicle?.toString() ===
                                                vehicleType[j]?.vehicle?.toString()
                                            );
                                        }
                                    );

                                    if (!selectedVehicleType) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `please select a vehicle type in ${excursion?.activity?.name}`
                                        );
                                    }

                                    let pvtTransferPrice =
                                        selectedVehicleType?.price * Number(vehicleType[j].count);

                                    pvtTransferCost = pvtTransferPrice / Number(totalPax);

                                    vehicleType[j].vehicleName = selectedVehicleType.vehicle.name;
                                }
                                transferType = "private";
                            } else if (
                                excursion?.excursionType === "transfer" &&
                                filteredExcursions[i]?.value.toLowerCase() === "shared"
                            ) {
                                if (!excursion?.transferPricing?.sicPrice) {
                                    return sendErrorResponse(
                                        res,
                                        400,
                                        `sic transfer not available in ${excursion?.excursionName}`
                                    );
                                }

                                let selectedExcursionDate =
                                    excursion?.transferPricing?.sicPrice?.find((scPrice) => {
                                        return (
                                            new Date(checkInDate) >= new Date(scPrice.fromDate) &&
                                            new Date(checkInDate) <= new Date(scPrice.toDate)
                                        );
                                    });

                                if (!selectedExcursionDate) {
                                    return sendErrorResponse(
                                        res,
                                        400,
                                        `no availabilty for excursion  ${excursion?.name} . please choose some other excursion`
                                    );
                                }

                                // const sicPriceWithMarkup =
                                //     profileMarkup && !isCustomMarkup
                                //         ? profileMarkup.landmarkMarkupType === "percentage"
                                //             ? (excursion?.transferPricing?.sicPrice / 100) *
                                //                   profileMarkup.landmarkMarkup +
                                //               excursion?.transferPricing?.sicPrice
                                //             : excursion?.transferPricing?.sicPrice +
                                //               profileMarkup.landmarkMarkup
                                //         : excursion?.transferPricing?.sicPrice;

                                excursionAdultCost = selectedExcursionDate.price;
                                excursionChildCost = selectedExcursionDate.price;
                                // excursionAdultPriceWithoutMarkup +=
                                //     excursion?.transferPricing?.sicPrice;
                                // excursionChildPriceWithoutMarkup +=
                                //     excursion?.transferPricing?.sicPrice;
                                transferType = "shared";
                            } else if (excursion?.excursionType === "ticket") {
                                if (filteredExcursions[i]?.value.toLowerCase() === "ticket") {
                                    let selectedExcursionDate =
                                        excursion.ticketPricing.ticketPrice.find((tktPrice) => {
                                            return (
                                                new Date(checkInDate) >=
                                                    new Date(tktPrice.fromDate) &&
                                                new Date(checkInDate) <= new Date(tktPrice.toDate)
                                            );
                                        });

                                    if (!selectedExcursionDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                        );
                                    }
                                    excursionAdultCost = selectedExcursionDate?.adultPrice;

                                    excursionChildCost = selectedExcursionDate?.childPrice;
                                } else if (
                                    filteredExcursions[i]?.value.toLowerCase() === "shared"
                                ) {
                                    let selectedExcursionDate =
                                        excursion.ticketPricing.sicWithTicket.find((sicPrice) => {
                                            return (
                                                new Date(checkInDate) >=
                                                    new Date(sicPrice.fromDate) &&
                                                new Date(checkInDate) <= new Date(sicPrice.toDate)
                                            );
                                        });

                                    if (!selectedExcursionDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.name} . please choose some other excursion`
                                        );
                                    }
                                    if (
                                        selectedExcursionDate?.adultPrice &&
                                        selectedExcursionDate?.childPrice
                                    ) {
                                        excursionAdultCost = selectedExcursionDate?.adultPrice;
                                        excursionChildCost = selectedExcursionDate?.childPrice;
                                        transferType = "shared";
                                    } else {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            "Excursion's SIC price not provided"
                                        );
                                    }
                                } else if (
                                    filteredExcursions[i]?.value.toLowerCase() === "private"
                                ) {
                                    let selectedExcursionDate =
                                        excursion.ticketPricing.ticketPrice.find((tktPrice) => {
                                            return (
                                                new Date(checkInDate) >=
                                                    new Date(tktPrice.fromDate) &&
                                                new Date(checkInDate) <= new Date(tktPrice.toDate)
                                            );
                                        });

                                    if (!selectedExcursionDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                        );
                                    }
                                    excursionAdultCost = selectedExcursionDate?.adultPrice;

                                    excursionChildCost = selectedExcursionDate?.childPrice;
                                    if (!vehicleType && vehicleType.length < 1) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `please select a transfer type in ${excursion?.name}`
                                        );
                                    }

                                    for (let j = 0; j < vehicleType.length; j++) {
                                        let selectedDate =
                                            excursion?.ticketPricing?.privateTransfer?.find(
                                                (pvt) => {
                                                    return (
                                                        new Date(checkInDate) >=
                                                            new Date(pvt?.fromDate) &&
                                                        new Date(checkInDate) <=
                                                            new Date(pvt?.toDate)
                                                    );
                                                }
                                            );

                                        if (!selectedDate) {
                                            return sendErrorResponse(
                                                res,
                                                400,
                                                `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                            );
                                        }

                                        const selectedVehicleType = selectedDate?.vehicleType?.find(
                                            (vehTY) => {
                                                return (
                                                    vehTY?.vehicle?.toString() ===
                                                    vehicleType[j]?.vehicle?.toString()
                                                );
                                            }
                                        );

                                        if (!selectedVehicleType) {
                                            return sendErrorResponse(
                                                res,
                                                400,
                                                `please select a vehicle type in ${excursion?.activity?.name}`
                                            );
                                        }

                                        let pvtTransferPrice =
                                            Number(selectedVehicleType?.price) *
                                            Number(vehicleType[j].count);

                                        pvtTransferCost += pvtTransferPrice / Number(totalPax);

                                        vehicleType[j].vehicleName =
                                            selectedVehicleType.vehicle.name;
                                    }

                                    transferType = "private";
                                }
                            } else {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "Something went wrong on excursion quotation. Please try again"
                                );
                            }

                            const selectedMarketPrice = market?.activities?.find((act) => {
                                return (
                                    act?.activity?.toString() === excursion?.activityId?.toString()
                                );
                            });

                            const adultMarketMarkup =
                                market && selectedMarketPrice
                                    ? filteredExcursions[i]?.value?.toLowerCase() === "private" &&
                                      excursion?.excursionType === "transfer"
                                        ? 0
                                        : selectedMarketPrice.markupType === "percentage"
                                        ? (excursionAdultCost / 100) * selectedMarketPrice.markup
                                        : selectedMarketPrice.markup
                                    : 0;

                            const childMarketMarkup =
                                market && selectedMarketPrice
                                    ? filteredExcursions[i]?.value?.toLowerCase() === "private" &&
                                      excursion?.excursionType.toLowerCase() === "transfer"
                                        ? 0
                                        : selectedMarketPrice.markupType === "percentage"
                                        ? (excursionChildCost / 100) * selectedMarketPrice.markup
                                        : selectedMarketPrice.markup
                                    : 0;

                            const pvtTransferMarketMarkup =
                                market &&
                                selectedMarketPrice &&
                                filteredExcursions[i]?.value?.toLowerCase() === "private"
                                    ? selectedMarketPrice?.transferMarkupType === "percentage"
                                        ? (pvtTransferCost / 100) *
                                          selectedMarketPrice.transferMarkup
                                        : selectedMarketPrice.transferMarkup
                                    : 0;

                            let excursionAdultPrice = excursionAdultCost + adultMarketMarkup;
                            let excursionChildPrice = excursionChildCost + childMarketMarkup;
                            let pvtTransferPrice =
                                filteredExcursions[i].value.toLowerCase() === "private"
                                    ? pvtTransferCost + pvtTransferMarketMarkup
                                    : 0;

                            filteredExcursions[i].adultCost = excursionAdultCost;
                            filteredExcursions[i].childCost = excursionChildCost;
                            filteredExcursions[i].pvtTransferCost = pvtTransferCost;
                            filteredExcursions[i].adultPrice = excursionAdultPrice;
                            filteredExcursions[i].childPrice = excursionChildPrice;
                            filteredExcursions[i].pvtTransferPrice = pvtTransferPrice;

                            filteredExcursions[i].adultMarketMarkup = adultMarketMarkup;
                            filteredExcursions[i].childMarketMarkup = childMarketMarkup;
                            filteredExcursions[i].pvtTransferMarketMarkup = pvtTransferMarketMarkup;
                            filteredExcursions[i].excursionName = excursion.activity.name;
                            filteredExcursions[i].excursionType = excursion.excursionType;
                            filteredExcursions[i].transferType = transferType;
                            filteredExcursions[i].value =
                                filteredExcursions[i]?.value?.toLowerCase();

                            excursionAdultTotal += excursionAdultPrice;
                            excursionChildTotal += excursionChildPrice;
                            excursionPvtTransferTotal += pvtTransferPrice;
                            adultMarketMarkupTotal += adultMarketMarkup;
                            childMarketMarkupTotal += childMarketMarkup;
                            pvtTransferMarketMarkupTotal +=
                                filteredExcursions[i].value.toLowerCase() === "private"
                                    ? pvtTransferMarketMarkup
                                    : 0;
                        }

                        const adultProfileMarkup =
                            profileMarkup && profileMarkup.quotation && !isCustomMarkup
                                ? profileMarkup.quotation.landAttractionMarkupType === "percentage"
                                    ? (excursionAdultTotal + adultMarketMarkupTotal / 100) *
                                      profileMarkup.quotation.landAttractionMarkup
                                    : profileMarkup.quotation.landAttractionMarkup
                                : 0;

                        const childProfileMarkup =
                            profileMarkup && profileMarkup.quotation && !isCustomMarkup
                                ? profileMarkup.quotation.landAttractionMarkupType === "percentage"
                                    ? (excursionChildTotal + childMarketMarkupTotal / 100) *
                                      profileMarkup.quotation.landAttractionMarkup
                                    : profileMarkup.quotation.landAttractionMarkup
                                : 0;

                        const pvtTransferProfileMarkup =
                            profileMarkup &&
                            profileMarkup.quotation &&
                            !isCustomMarkup &&
                            excursionPvtTransferTotal !== 0
                                ? profileMarkup.quotation.landTransferMarkupType === "percentage"
                                    ? (excursionPvtTransferTotal +
                                          pvtTransferMarketMarkupTotal / 100) *
                                      profileMarkup.quotation.landTransferMarkup
                                    : profileMarkup.quotation.landTransferMarkup
                                : 0;

                        excursionAdultTotal =
                            excursionAdultTotal +
                            adultProfileMarkup +
                            excursionPvtTransferTotal +
                            pvtTransferProfileMarkup;

                        excursionChildTotal =
                            excursionChildTotal +
                            childProfileMarkup +
                            excursionPvtTransferTotal +
                            pvtTransferProfileMarkup;

                        excursionQuotation = new ExcursionQuotation({
                            excursions: [...filteredExcursions],
                            adultTotal: excursionAdultTotal,
                            childrenTotal: excursionChildTotal,
                            adultProfileMarkup: adultProfileMarkup,
                            childProfileMarkup: childProfileMarkup,
                            pvtTransferProfileMarkup: pvtTransferProfileMarkup,
                            adultMarketMarkup: adultMarketMarkupTotal,
                            childMarketMarkup: childMarketMarkupTotal,
                            pvtTransferMarketMarkup: pvtTransferMarketMarkupTotal,
                        });

                        adultProfileMarkupTotal += adultProfileMarkup;
                        childProfileMarkupTotal += childProfileMarkup;
                        pvtTransferProfileMarkupTotal += pvtTransferProfileMarkup;
                        await excursionQuotation.save();
                    }
                }
            }

            let supplementAdultTotal = 0;
            let supplementChildTotal = 0;
            let SupplementPvtTransferTotal = 0;
            let SupplementAdultTotalCost = 0;
            let SupplementChildTotalCost = 0;
            let totalSupplementPvtTransferTotalCost = 0;
            let adultSupplementMarketMarkupTotal = 0;
            let childSupplementMarketMarkupTotal = 0;
            let pvtSupplementTransferMarketMarkupTotal = 0;
            let adultSupplementProfileMarkupTotal = 0;
            let childSupplementProfileMarkupTotal = 0;
            let pvtSupplementTransferProfileMarkupTotal = 0;

            let excSupplementQuotation;
            if (isSupplimentQuotationDisabled === false) {
                if (selectedExcursionTypeSuppliments?.length > 0) {
                    const filteredExcursions = selectedExcursionTypeSuppliments?.filter((item) => {
                        if (item?.excursionId && item?.value) {
                            return item;
                        }
                        return "";
                    });

                    if (filteredExcursions?.length > 0) {
                        for (let i = 0; i < filteredExcursions?.length; i++) {
                            let excursionAdultCost = 0;
                            let excursionChildCost = 0;
                            let pvtTransferCost = 0;

                            const excursions = await Excursion.aggregate([
                                {
                                    $match: {
                                        activityId: Types.ObjectId(
                                            filteredExcursions[i]?.excursionId
                                        ),
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
                                        activity: {
                                            $arrayElemAt: ["$activity", 0],
                                        },
                                    },
                                },
                            ]);

                            let excursion = excursions[0];

                            // Now 'excursion' contains the populated vehicle information

                            if (!excursion) {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "You selected an invalid excursion. Please double check and try again"
                                );
                            }

                            const vehicleType = filteredExcursions[i].vehicleType;

                            let transferType = "without";

                            if (
                                excursion?.excursionType === "transfer" &&
                                filteredExcursions[i]?.value.toLowerCase() === "private"
                            ) {
                                if (vehicleType && vehicleType.length < 1) {
                                    return sendErrorResponse(
                                        res,
                                        400,
                                        `please select a transfer type in ${excursion?.name}`
                                    );
                                }

                                for (let j = 0; j < vehicleType.length; j++) {
                                    let selectedDate =
                                        excursion?.transferPricing?.privateTransfer?.find((pvt) => {
                                            return (
                                                new Date(checkInDate) >= new Date(pvt?.fromDate) &&
                                                new Date(checkInDate) <= new Date(pvt?.toDate)
                                            );
                                        });

                                    if (!selectedDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                        );
                                    }

                                    const selectedVehicleType = selectedDate?.vehicleType?.find(
                                        (vehTY) => {
                                            return (
                                                vehTY?.vehicle?.toString() ===
                                                vehicleType[j]?.vehicle?.toString()
                                            );
                                        }
                                    );

                                    if (!selectedVehicleType) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `please select a vehicle type in ${excursion?.activity?.name}`
                                        );
                                    }

                                    let pvtTransferPrice =
                                        selectedVehicleType?.price * Number(vehicleType[j].count);

                                    pvtTransferCost = pvtTransferPrice / Number(totalPax);

                                    vehicleType[j].vehicleName = selectedVehicleType.vehicle.name;
                                }
                                transferType = "private";
                            } else if (
                                excursion?.excursionType === "transfer" &&
                                filteredExcursions[i]?.value.toLowerCase() === "shared"
                            ) {
                                if (!excursion?.transferPricing?.sicPrice) {
                                    return sendErrorResponse(
                                        res,
                                        400,
                                        `sic transfer not available in ${excursion?.excursionName}`
                                    );
                                }

                                let selectedExcursionDate =
                                    excursion?.transferPricing?.sicPrice?.find((scPrice) => {
                                        return (
                                            new Date(checkInDate) >= new Date(scPrice.fromDate) &&
                                            new Date(checkInDate) <= new Date(scPrice.toDate)
                                        );
                                    });

                                if (!selectedExcursionDate) {
                                    return sendErrorResponse(
                                        res,
                                        400,
                                        `no availabilty for excursion  ${excursion?.name} . please choose some other excursion`
                                    );
                                }

                                // const sicPriceWithMarkup =
                                //     profileMarkup && !isCustomMarkup
                                //         ? profileMarkup.landmarkMarkupType === "percentage"
                                //             ? (excursion?.transferPricing?.sicPrice / 100) *
                                //                   profileMarkup.landmarkMarkup +
                                //               excursion?.transferPricing?.sicPrice
                                //             : excursion?.transferPricing?.sicPrice +
                                //               profileMarkup.landmarkMarkup
                                //         : excursion?.transferPricing?.sicPrice;

                                excursionAdultCost = selectedExcursionDate.price;
                                excursionChildCost = selectedExcursionDate.price;
                                // excursionAdultPriceWithoutMarkup +=
                                //     excursion?.transferPricing?.sicPrice;
                                // excursionChildPriceWithoutMarkup +=
                                //     excursion?.transferPricing?.sicPrice;
                                transferType = "shared";
                            } else if (excursion?.excursionType === "ticket") {
                                if (filteredExcursions[i]?.value.toLowerCase() === "ticket") {
                                    let selectedExcursionDate =
                                        excursion.ticketPricing.ticketPrice.find((tktPrice) => {
                                            return (
                                                new Date(checkInDate) >=
                                                    new Date(tktPrice.fromDate) &&
                                                new Date(checkInDate) <= new Date(tktPrice.toDate)
                                            );
                                        });

                                    if (!selectedExcursionDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                        );
                                    }
                                    excursionAdultCost = selectedExcursionDate?.adultPrice;

                                    excursionChildCost = selectedExcursionDate?.childPrice;
                                } else if (
                                    filteredExcursions[i]?.value.toLowerCase() === "shared"
                                ) {
                                    let selectedExcursionDate =
                                        excursion.ticketPricing.sicWithTicket.find((sicPrice) => {
                                            return (
                                                new Date(checkInDate) >=
                                                    new Date(sicPrice.fromDate) &&
                                                new Date(checkInDate) <= new Date(sicPrice.toDate)
                                            );
                                        });

                                    if (!selectedExcursionDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.name} . please choose some other excursion`
                                        );
                                    }
                                    if (
                                        selectedExcursionDate?.adultPrice &&
                                        selectedExcursionDate?.childPrice
                                    ) {
                                        excursionAdultCost = selectedExcursionDate?.adultPrice;
                                        excursionChildCost = selectedExcursionDate?.childPrice;
                                        transferType = "shared";
                                    } else {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            "Excursion's SIC price not provided"
                                        );
                                    }
                                } else if (
                                    filteredExcursions[i]?.value.toLowerCase() === "private"
                                ) {
                                    let selectedExcursionDate =
                                        excursion.ticketPricing.ticketPrice.find((tktPrice) => {
                                            return (
                                                new Date(checkInDate) >=
                                                    new Date(tktPrice.fromDate) &&
                                                new Date(checkInDate) <= new Date(tktPrice.toDate)
                                            );
                                        });

                                    if (!selectedExcursionDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                        );
                                    }
                                    excursionAdultCost = selectedExcursionDate?.adultPrice;

                                    excursionChildCost = selectedExcursionDate?.childPrice;
                                    if (!vehicleType && vehicleType.length < 1) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `please select a transfer type in ${excursion?.name}`
                                        );
                                    }

                                    for (let j = 0; j < vehicleType.length; j++) {
                                        let selectedDate =
                                            excursion?.ticketPricing?.privateTransfer?.find(
                                                (pvt) => {
                                                    return (
                                                        new Date(checkInDate) >=
                                                            new Date(pvt?.fromDate) &&
                                                        new Date(checkInDate) <=
                                                            new Date(pvt?.toDate)
                                                    );
                                                }
                                            );

                                        if (!selectedDate) {
                                            return sendErrorResponse(
                                                res,
                                                400,
                                                `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                            );
                                        }

                                        const selectedVehicleType = selectedDate?.vehicleType?.find(
                                            (vehTY) => {
                                                return (
                                                    vehTY?.vehicle?.toString() ===
                                                    vehicleType[j]?.vehicle?.toString()
                                                );
                                            }
                                        );

                                        if (!selectedVehicleType) {
                                            return sendErrorResponse(
                                                res,
                                                400,
                                                `please select a vehicle type in ${excursion?.activity?.name}`
                                            );
                                        }

                                        let pvtTransferPrice =
                                            Number(selectedVehicleType?.price) *
                                            Number(vehicleType[j].count);

                                        pvtTransferCost += pvtTransferPrice / Number(totalPax);

                                        vehicleType[j].vehicleName =
                                            selectedVehicleType.vehicle.name;
                                    }

                                    transferType = "private";
                                }
                            } else {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "Something went wrong on excursion quotation. Please try again"
                                );
                            }

                            const selectedMarketPrice = market?.activities?.find((act) => {
                                return (
                                    act?.activity?.toString() === excursion?.activityId?.toString()
                                );
                            });

                            const selectedProfilePrice = profileMarkup?.activities?.find((act) => {
                                return (
                                    act?.activity?.toString() === excursion?.activityId?.toString()
                                );
                            });

                            let excursionAdultPrice = 0;
                            let excursionChildPrice = 0;
                            let adultMarketMarkup = 0;
                            let childMarketMarkup = 0;
                            let pvtTransferMarketMarkup = 0;
                            let adultProfileMarkup = 0;
                            let childProfileMarkup = 0;
                            let pvtTransferPrice = 0;

                            adultMarketMarkup =
                                market && selectedMarketPrice
                                    ? filteredExcursions[i]?.value?.toLowerCase() === "private" &&
                                      excursion?.excursionType === "transfer"
                                        ? 0
                                        : selectedMarketPrice.markupType === "percentage"
                                        ? (excursionAdultCost / 100) * selectedMarketPrice.markup
                                        : selectedMarketPrice.markup
                                    : 0;

                            childMarketMarkup =
                                market && selectedMarketPrice
                                    ? filteredExcursions[i]?.value?.toLowerCase() === "private" &&
                                      excursion?.excursionType.toLowerCase() === "transfer"
                                        ? 0
                                        : selectedMarketPrice.markupType === "percentage"
                                        ? (excursionChildCost / 100) * selectedMarketPrice.markup
                                        : selectedMarketPrice.markup
                                    : 0;

                            pvtTransferMarketMarkup =
                                market &&
                                selectedMarketPrice &&
                                filteredExcursions[i]?.value?.toLowerCase() === "private"
                                    ? selectedMarketPrice?.transferMarkupType === "percentage"
                                        ? (pvtTransferCost / 100) *
                                          selectedMarketPrice?.transferMarkup
                                        : selectedMarketPrice?.transferMarkup
                                    : 0;

                            excursionAdultPrice =
                                Number(excursionAdultCost) +
                                Number(adultMarketMarkup) +
                                Number(pvtTransferCost) +
                                Number(pvtTransferMarketMarkup);
                            excursionChildPrice =
                                Number(excursionChildCost) +
                                Number(childMarketMarkup) +
                                Number(pvtTransferCost) +
                                Number(pvtTransferMarketMarkup);
                            pvtTransferPrice =
                                Number(pvtTransferCost) + Number(pvtTransferMarketMarkup);

                            adultProfileMarkup =
                                profileMarkup && selectedProfilePrice
                                    ? filteredExcursions[i]?.value?.toLowerCase() === "private" &&
                                      excursion?.excursionType === "transfer"
                                        ? 0
                                        : selectedProfilePrice?.markupType === "percentage"
                                        ? (excursionAdultPrice / 100) * selectedProfilePrice?.markup
                                        : selectedProfilePrice?.markup
                                    : 0;

                            childProfileMarkup =
                                profileMarkup && selectedProfilePrice
                                    ? filteredExcursions[i]?.value?.toLowerCase() === "private" &&
                                      excursion?.excursionType.toLowerCase() === "transfer"
                                        ? 0
                                        : selectedProfilePrice.markupType === "percentage"
                                        ? (excursionChildPrice / 100) * selectedProfilePrice.markup
                                        : selectedProfilePrice.markup
                                    : 0;

                            excursionAdultPrice += adultProfileMarkup;
                            excursionChildPrice += childProfileMarkup;

                            filteredExcursions[i].adultCost = excursionAdultCost;
                            filteredExcursions[i].childCost = excursionChildCost;
                            filteredExcursions[i].pvtTransferCost = pvtTransferCost;
                            filteredExcursions[i].adultPrice = excursionAdultPrice;
                            filteredExcursions[i].childPrice = excursionChildPrice;
                            filteredExcursions[i].pvtTransferPrice = pvtTransferPrice;
                            filteredExcursions[i].adultMarketMarkup = adultMarketMarkup;
                            filteredExcursions[i].childMarketMarkup = childMarketMarkup;
                            filteredExcursions[i].pvtTransferMarketMarkup = pvtTransferMarketMarkup;
                            filteredExcursions[i].excursionName = excursion.activity.name;
                            filteredExcursions[i].excursionType = excursion.excursionType;
                            filteredExcursions[i].transferType = transferType;
                            filteredExcursions[i].value = filteredExcursions[i].value;
                            filteredExcursions[i].adultProfileMarkup = adultProfileMarkup;
                            filteredExcursions[i].childProfileMarkup = childProfileMarkup;
                            supplementAdultTotal += excursionAdultPrice;
                            supplementChildTotal += excursionChildPrice;
                            SupplementPvtTransferTotal += pvtTransferPrice;
                            adultSupplementMarketMarkupTotal += adultMarketMarkup;
                            childSupplementMarketMarkupTotal += childMarketMarkup;
                            pvtSupplementTransferMarketMarkupTotal += pvtTransferMarketMarkup;
                        }

                        excSupplementQuotation = new ExcSupplementsQuotation({
                            excursions: [...filteredExcursions],
                        });

                        await excSupplementQuotation.save();
                    }
                }
            }

            let visa;
            if (isVisaQuotationDisabled === false) {
                if (!isValidObjectId(visaId)) {
                    return sendErrorResponse(res, 400, "invalid visa or add  visa quotation ");
                }

                if (!isValidObjectId(selectedVisaNationality)) {
                    return sendErrorResponse(
                        res,
                        400,
                        "invalid visa nationality or add  visa nationality "
                    );
                }

                const visaResponse = await VisaType.aggregate([
                    { $match: { _id: Types.ObjectId(visaId), isDeleted: false } },
                    {
                        $lookup: {
                            from: "visas",
                            localField: "visa",
                            foreignField: "_id",
                            as: "visaCountry",
                        },
                    },
                    {
                        $project: {
                            markup: 0,
                        },
                    },
                ]);

                const visaNationality = await VisaNationality.findOne({
                    isDeleted: false,
                    _id: selectedVisaNationality,
                });

                const selectedVisaType = visaNationality.visas.find(
                    (visa) =>
                        visa.visaType.toString() === visaId.toString() &&
                        !visa.isDeleted &&
                        visa?.createdFor.toLocaleLowerCase() === "quotation"
                );

                if (!selectedVisaType) {
                    return sendErrorResponse(
                        res,
                        400,
                        "invalid visa type or add  visa type not found  "
                    );
                }

                if (!visaResponse || visaResponse?.length < 1) {
                    return sendErrorResponse(
                        res,
                        400,
                        "Invalid visa id, Please check and try again"
                    );
                }
                visa = visaResponse[0];
                const selectedMarketPrice = market?.visa?.find((vs) => {
                    return vs?.visa?.toString() === visaId?.toString();
                });
                visa.adultMarketMarkup =
                    market && selectedMarketPrice
                        ? selectedMarketPrice.markupType === "percentage"
                            ? (selectedVisaType.adultPrice / 100) * selectedMarketPrice.markup
                            : selectedMarketPrice.markup
                        : 0;

                visa.childMarketMarkup =
                    market && selectedMarketPrice
                        ? selectedMarketPrice.markupType === "percentage"
                            ? (selectedVisaType.childPrice / 100) * selectedMarketPrice.markup
                            : selectedMarketPrice.markup
                        : 0;

                visa.adultProfileMarkup =
                    profileMarkup && profileMarkup.quotation && !isCustomMarkup
                        ? profileMarkup.quotation.visaMarkupType === "percentage"
                            ? ((selectedVisaType.adultPrice + visa.adultMarketMarkup) / 100) *
                              profileMarkup.quotation.visaMarkup
                            : profileMarkup.quotation.visaMarkup
                        : 0;

                visa.childProfileMarkup =
                    profileMarkup && profileMarkup.quotation && !isCustomMarkup
                        ? profileMarkup.quotation.visaMarkupType === "percentage"
                            ? ((selectedVisaType.childPrice + visa.childMarketMarkup) / 100) *
                              profileMarkup.quotation.visaMarkup
                            : profileMarkup.quotation.visaMarkup
                        : 0;

                visa.adultCost = selectedVisaType.adultPrice;
                visa.childCost = selectedVisaType.childPrice;
                visa.adultPrice =
                    selectedVisaType.adultPrice + visa.adultProfileMarkup + visa.adultMarketMarkup;

                visa.childPrice =
                    selectedVisaType.childPrice + visa.childProfileMarkup + visa.childMarketMarkup;

                if (otbPrice && Number(otbPrice) < 1) {
                    return sendErrorResponse(
                        res,
                        400,
                        "OTB Price should be grater than or equal to 1"
                    );
                }
            }

            let adultTotalPrice =
                (visa ? visa?.adultPrice + (otbPrice ? Number(otbPrice) : 0) : 0) +
                excursionAdultTotal;
            let childrenTotalPrice =
                (visa ? visa?.childPrice + (otbPrice ? Number(otbPrice) : 0) : 0) +
                excursionChildTotal;
            let totalAdultMarketMarkup =
                adultMarketMarkupTotal +
                (visa ? visa?.adultMarketMarkup : 0) +
                pvtTransferMarketMarkupTotal;

            let totalChildMarketMarkup =
                childMarketMarkupTotal +
                (visa ? visa?.childMarketMarkup : 0) +
                pvtTransferMarketMarkupTotal;
            let totalAdultProfileMarkup =
                adultProfileMarkupTotal +
                (visa ? visa?.adultProfileMarkup : 0) +
                pvtTransferProfileMarkupTotal;
            let totalChildProfileMarkup =
                childProfileMarkupTotal +
                (visa ? visa?.childProfileMarkup : 0) +
                pvtTransferProfileMarkupTotal;

            let transferQuotation;
            if (isTransferQuotationDisabled === false) {
                if (transfer?.length < 1) {
                    return sendErrorResponse(
                        res,
                        400,
                        `please select a transfer type in  transfer`
                    );
                }

                let transferMarkup;
                let stayTransfers = [];
                for (let i = 0; i < transfer?.length; i++) {
                    let stay = transfer[i];

                    let transfers = [];
                    let ppTotalPricePerStayTransfer = 0;
                    let ppTotalMarketMarkupPerStayTransfer = 0;
                    for (let j = 0; j < stay?.stays?.length; j++) {
                        let transferDt = stay?.stays[j];

                        if (!transferDt?.vehicleTypes || transferDt?.vehicleTypes?.length < 1) {
                            continue;
                        }

                        let transferFromDetails;
                        let transferToDetails;
                        if (transferDt.transferType === "city-city") {
                            transferFromDetails = await Area.findOne({
                                _id: transferDt.transferFrom,
                                isDeleted: false,
                            });
                            transferToDetails = await Area.findOne({
                                _id: transferDt.transferTo,
                                isDeleted: false,
                            });
                        } else if (transferDt.transferType === "airport-city") {
                            transferFromDetails = await Airport.findOne({
                                _id: transferDt.transferFrom,
                                isDeleted: false,
                            });
                            transferToDetails = await Area.findOne({
                                _id: transferDt.transferTo,
                                isDeleted: false,
                            });
                        } else if (transferDt.transferType === "city-airport") {
                            transferFromDetails = await Area.findOne({
                                _id: transferDt.transferFrom,
                                isDeleted: false,
                            });
                            transferToDetails = await Airport.findOne({
                                _id: transferDt.transferTo,
                                isDeleted: false,
                            });
                        }

                        if (!transferFromDetails && !transferToDetails) {
                            return sendErrorResponse(res, 400, `hub is not found for transfer`);
                        }

                        let transferFromId;
                        let transferToId;

                        if (transferDt.transferType === "city-city") {
                            let transferFromGroup = await GroupArea.findOne({
                                isDeleted: false,

                                areas: { $in: [transferDt.transferFrom] },
                            });
                            let transferToGroup = await GroupArea.findOne({
                                isDeleted: false,

                                areas: { $in: [transferDt.transferTo] },
                            });
                            transferFromId = transferFromGroup._id;
                            transferToId = transferToGroup._id;
                        } else if (transferDt.transferType === "city-airport") {
                            let transferFromGroup = await GroupArea.findOne({
                                isDeleted: false,

                                areas: { $in: [transferDt.transferFrom] },
                            });
                            transferFromId = transferFromGroup._id;
                            transferToId = transferDt.transferTo;
                        } else if (transferDt.transferType === "airport-city") {
                            let transferToGroup = await GroupArea.findOne({
                                isDeleted: false,

                                areas: { $in: [transferDt.transferTo] },
                            });
                            transferFromId = transferDt.transferFrom;
                            transferToId = transferToGroup._id;
                        }

                        let transferDetails = await Transfer.findOne({
                            isDeleted: false,

                            // transferType: transferDt?.transferType,
                            transferFrom: transferFromId,
                            transferTo: transferToId,
                        });

                        if (!transferDetails) {
                            return sendErrorResponse(
                                res,
                                400,
                                "transfer from not found for this hubs."
                            );
                        }

                        const selectedMarketPrice = market?.transfer?.find((tf) => {
                            return tf?.transferId?.toString() === transferDetails?._id?.toString();
                        });

                        const promises = [];
                        let totalCost = 0;
                        let totalPrice = 0;
                        let totalMarketMarkup = 0;
                        let profileMarkup = 0;
                        let totalCapacity;
                        let vehicleTypes = [];
                        for (let i = 0; i < transferDt?.vehicleTypes?.length; i++) {
                            if (Number(transferDt?.vehicleTypes[i]?.count) < 1) {
                                continue;
                            }

                            let vehicleType = transferDetails?.vehicleType.find(
                                (vehType) =>
                                    vehType?.vehicle?.toString() ===
                                    transferDt?.vehicleTypes[i]?.vehicle?.toString()
                            );

                            if (!vehicleType) {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "There is no vehicle type found for this particular airport transfer."
                                );
                            }

                            let singleVehicleType = await VehicleType.findById(vehicleType.vehicle);

                            if (!singleVehicleType) {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "There is no vehicle type found for this particular airport transfer."
                                );
                            }

                            const selectedVehiclePrice = selectedMarketPrice?.vehicleType?.find(
                                (vehType) => {
                                    return (
                                        vehType?.vehicleId.toString() ===
                                        vehicleType?.vehicle.toString()
                                    );
                                }
                            );

                            const marketMarkupPerVehicle =
                                market && selectedVehiclePrice
                                    ? selectedVehiclePrice.markupType === "percentage"
                                        ? (vehicleType?.price / 100) * selectedVehiclePrice.markup
                                        : selectedVehiclePrice.markup
                                    : 0;

                            totalCost += Number(vehicleType?.price);

                            totalPrice +=
                                Number(marketMarkupPerVehicle) + Number(vehicleType?.price);
                            totalMarketMarkup += marketMarkupPerVehicle;

                            totalCapacity = singleVehicleType
                                ? singleVehicleType?.airportOccupancy *
                                  Number(transferDt?.vehicleTypes[i]?.count)
                                : 0;

                            vehicleTypes.push({
                                vehicle: singleVehicleType?._id,
                                name: singleVehicleType?.name,
                                count: transferDt?.vehicleTypes[i]?.count,
                                occupancy: singleVehicleType?.airportOccupancy,
                            });

                            promises.push(vehicleTypes);
                        }

                        const promiseResponse = await Promise.all([...promises]);

                        let ppTotalPricePerTransfer = Number(totalPrice) / Number(totalPax);
                        let ppMarketMarkup = Number(totalMarketMarkup) / Number(totalPax);

                        transfers.push({
                            transferId: transferDetails._id,
                            transferType: transferDt?.transferType,
                            transferFromName:
                                transferDt.transferType === "airport-city"
                                    ? transferFromDetails?.airportName
                                    : transferFromDetails?.areaName,
                            transferFrom: transferDt?.transferFrom,
                            transferTo: transferDt?.transferTo,
                            transferToName:
                                transferDt.transferType === "city-airport"
                                    ? transferToDetails.airportName
                                    : transferToDetails.areaName,
                            transferToHubName: transferDt.transferToName,
                            transferFromHubName: transferDt.transferFromName,
                            transferFromId: transferDt?.transferFromId,
                            transferToId: transferDt.transferToId,
                            transferFromId: transferDt.transferFromId,
                            transferToName: transferDt?.transferFromName,
                            vehicleTypes,
                            ppTotalPricePerTransfer: Number(ppTotalPricePerTransfer),
                            ppMarketMarkup: Number(ppMarketMarkup),
                            transferCapacity: Number(totalCapacity),
                        });

                        ppTotalPricePerStayTransfer += Number(ppTotalPricePerTransfer);
                        ppTotalMarketMarkupPerStayTransfer += Number(ppMarketMarkup);
                    }

                    let transferProfileMarkup =
                        profileMarkup && profileMarkup.quotation && !isCustomMarkup
                            ? profileMarkup.quotation.landTransferMarkupType === "percentage"
                                ? (ppTotalPricePerStayTransfer / 100) *
                                  profileMarkup?.quotation?.landTransferMarkup
                                : profileMarkup?.quotation?.landTransferMarkup
                            : 0;

                    stayTransfers.push({
                        transfers,
                        ppTotalPricePerStayTransfer: Number(
                            ppTotalPricePerStayTransfer + transferProfileMarkup
                        ),
                        ppTotalMarketMarkupPerStayTransfer: Number(
                            ppTotalMarketMarkupPerStayTransfer
                        ),
                        ppTotalProfileMarkupPerStayTransfer: Number(transferProfileMarkup),
                        stayNo: Number(stay.stayNo),
                    });
                }

                transferQuotation = new TransferQuotation({
                    stayTransfers: stayTransfers,
                });

                await transferQuotation.save();
            }

            let hotelQuotation;
            if (isHotelQuotationDisabled === false) {
                if (isAlreadyBooked) {
                    if (stays?.length < 1) {
                        return sendErrorResponse(
                            res,
                            400,
                            "Please fill required fileds on hotel quotation or disable it"
                        );
                    }

                    let filteredQuation = stays.map((stay) => {
                        let filteredHotels = stay?.hotels?.filter((hotel) => {
                            if (hotel?.hotelId) {
                                return hotel;
                            }
                            return "";
                        });

                        return {
                            hotels: filteredHotels,
                        };
                    });

                    for (let j = 0; j < filteredQuation?.length; j++) {
                        let hotels = filteredQuation[j].hotels;

                        if (filteredQuation[j].hotels?.length < 1) {
                            return sendErrorResponse(
                                res,
                                400,
                                "Please fill required fileds on hotel quotation or disable it"
                            );
                        }

                        for (let i = 0; i < hotels?.length; i++) {
                            let hotelData = await Hotel.findOne({
                                _id: hotels[i].hotelId,
                            }).populate("country state city");

                            if (!hotelData) {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "selected hotel is not found in this list "
                                );
                            }

                            hotels[i].hotelName = hotelData?.hotelName;
                            hotels[i].starCategory = hotelData?.starCategory;
                            hotels[i].country = hotelData?.country?.countryName;
                            hotels[i].state = hotelData?.state?.stateName;
                            hotels[i].city = hotelData?.city?.cityName;
                            hotels[i].cityId = hotelData?.city?._id;
                            hotels[i].areaId = hotelData?.area?._id;
                            hotels[i].area = hotelData?.area?.areaName;
                        }
                    }

                    hotelQuotation = new HotelQuotation({
                        stays: filteredQuation,
                        isAlreadyBooked,
                    });

                    await hotelQuotation.save();

                    adultTotalPrice +=
                        Number(transferQuotation?.stayTransfers[0]?.ppTotalPricePerStayTransfer) ||
                        0;

                    childrenTotalPrice +=
                        Number(transferQuotation?.stayTransfers[0]?.ppTotalPricePerStayTransfer) ||
                        0;

                    totalChildMarketMarkup +=
                        Number(
                            transferQuotation?.stayTransfers[0]?.ppTotalMarketMarkupPerStayTransfer
                        ) || 0;
                    totalAdultMarketMarkup +=
                        Number(
                            transferQuotation?.stayTransfers[0]?.ppTotalMarketMarkupPerStayTransfer
                        ) || 0;

                    totalAdultProfileMarkup +=
                        Number(
                            transferQuotation?.stayTransfers[0]?.ppTotalProfileMarkupPerStayTransfer
                        ) || 0;
                    totalChildProfileMarkup +=
                        Number(
                            transferQuotation?.stayTransfers[0]?.ppTotalProfileMarkupPerStayTransfer
                        ) || 0;
                } else {
                    if (stays?.length < 1) {
                        return sendErrorResponse(
                            res,
                            400,
                            "Please fill required fileds on hotel quotation or disable it"
                        );
                    }

                    let filteredQuation = stays.map((stay) => {
                        let filteredHotels = stay?.hotels?.filter((hotel) => {
                            if (hotel?.hotelId) {
                                return hotel;
                            }
                            return "";
                        });

                        return {
                            hotels: filteredHotels,
                        };
                    });

                    if (filteredQuation?.length < 1) {
                        return sendErrorResponse(
                            res,
                            400,
                            "Please fill required fileds on hotel quotation or disable it"
                        );
                    }

                    let idx = 1;
                    for (let j = 0; j < filteredQuation?.length; j++) {
                        let totalNumDays = 0;
                        let hotelTransferPrice = 0;
                        let occupancyArray = [];

                        if (filteredQuation[j].hotels?.length < 1) {
                            return sendErrorResponse(
                                res,
                                400,
                                "Please fill required fileds on hotel quotation or disable it"
                            );
                        }

                        let hotels = filteredQuation[j].hotels;

                        for (let i = 0; i < hotels?.length; i++) {
                            const dateFrom = new Date(hotels[i].checkInDate);
                            const dateTo = new Date(hotels[i].checkOutDate);
                            const timeDiff = Math.abs(dateTo.getTime() - dateFrom.getTime());

                            const numDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

                            hotels[i].checkInDate = new Date(hotels[i].checkInDate)
                                .toISOString()
                                .substring(0, 10);

                            hotels[i].checkOutDate = new Date(hotels[i].checkOutDate)
                                .toISOString()
                                .substring(0, 10);

                            if (
                                hotels[i].checkInDate > checkOutDate ||
                                hotels[i].checkOutDate > checkOutDate
                            ) {
                                return sendErrorResponse(
                                    res,
                                    404,
                                    `Date selected found to be above checkout date for stay ${
                                        j + 1
                                    } and hotel ${i + 1}, Please check and try again`
                                );
                            }

                            if (
                                hotels[i].checkInDate < checkInDate ||
                                hotels[i].checkOutDate < checkInDate
                            ) {
                                return sendErrorResponse(
                                    res,
                                    404,
                                    `Date selected found to be below checkin date for stay ${
                                        j + 1
                                    } and hotel ${i + 1}, Please check and try again`
                                );
                            }

                            if (numDays < 1) {
                                return sendErrorResponse(
                                    res,
                                    404,
                                    "Date selected found to be wrong , Please check and try again"
                                );
                            }
                            isExcursionQuotationDisabled;

                            const hotelData = await singleRoomTypeRate(
                                noOfAdults,
                                noOfChildren,
                                childrenAges,
                                hotels[i].checkInDate,
                                hotels[i].checkOutDate,
                                hotels[i].hotelId,
                                hotels[i].roomTypeId,
                                hotels[i].boardTypeCode
                            );

                            for (let k = 0; k < hotelData.rates.length; k++) {
                                hotelData.rates[k].cost = hotelData.rates[k].price;

                                if (hotelData.rates[k].price) {
                                    const selectHotel = market?.hotel?.find((ht) => {
                                        return (
                                            ht?.hotelId?.toString() ===
                                            hotels[i]?.hotelId?.toString()
                                        );
                                    });

                                    const selectedRoomType = selectHotel?.roomTypes.find(
                                        (roomType) => {
                                            if (hotels[i]?.isCustomHotelMarkup) {
                                                return (
                                                    roomType.roomTypeId?.toString() ===
                                                    hotels[i].roomTypeId.toString()
                                                );
                                            }
                                        }
                                    );

                                    const selectedStarCategory = market?.starCategory?.find(
                                        (sc) => {
                                            return (
                                                sc?.name?.toString() ===
                                                hotelData?.hotel?.starCategory?.toString()
                                            );
                                        }
                                    );

                                    hotelData.rates[k].marketMarkup =
                                        market && selectedRoomType
                                            ? selectedRoomType.markupType === "percentage"
                                                ? (hotelData.rates[k].price / 100) *
                                                  selectedRoomType.markup *
                                                  numDays
                                                : selectedRoomType.markup * numDays
                                            : market && selectedStarCategory
                                            ? selectedStarCategory.markupType === "percentage"
                                                ? (hotelData.rates[k].price / 100) *
                                                  selectedStarCategory.markup *
                                                  numDays
                                                : selectedStarCategory.markup * numDays
                                            : 0;

                                    hotelData.rates[k].profileMarkup =
                                        profileMarkup && profileMarkup.quotation && !isCustomMarkup
                                            ? profileMarkup.quotation.hotelMarkupType ===
                                              "percentage"
                                                ? (hotelData.rates[k].marketMarkup +
                                                      hotelData.rates[k].price / 100) *
                                                  profileMarkup?.quotation?.hotelMarkup *
                                                  numDays
                                                : profileMarkup?.quotation?.hotelMarkup * numDays
                                            : 0;

                                    hotelData.rates[k].price =
                                        hotelData.rates[k].profileMarkup +
                                        hotelData.rates[k].marketMarkup +
                                        hotelData.rates[k].cost;
                                }

                                let existing = occupancyArray.find(
                                    (occupancy) =>
                                        occupancy.occupancyShortName ===
                                        hotelData.rates[k].occupancyShortName
                                );

                                if (existing) {
                                    if (
                                        (hotelData.rates[k].price > 0 ||
                                            hotelData.rates[k].price === 0) &&
                                        (existing.price > 0 || existing.price === 0)
                                    ) {
                                        existing.price += Number(hotelData?.rates[k]?.price);
                                        existing.profileMarkup += Number(
                                            hotelData?.rates[k]?.profileMarkup
                                        );
                                        existing.marketMarkup += Number(
                                            hotelData?.rates[k]?.marketMarkup
                                        );
                                    } else {
                                        existing.price = null;
                                        existing.profileMarkup = null;
                                        existing.marketMarkup = null;
                                    }
                                } else {
                                    if (
                                        hotelData.rates[k].price > 0 ||
                                        hotelData.rates[k].price === 0
                                    ) {
                                        occupancyArray.push({
                                            occupancyShortName:
                                                hotelData?.rates[k]?.occupancyShortName,
                                            price: Number(hotelData?.rates[k]?.price),
                                            marketMarkup: Number(hotelData.rates[k].marketMarkup),
                                            profileMarkup: Number(hotelData.rates[k].profileMarkup),
                                        });
                                    } else {
                                        occupancyArray.push({
                                            occupancyShortName:
                                                hotelData.rates[k].occupancyShortName,
                                            price: null,
                                            profileMarkup: null,
                                            marketMarkup: null,
                                        });
                                    }
                                }
                            }

                            hotels[i].hotelName = hotelData?.hotel?.hotelName;
                            hotels[i].starCategory = hotelData?.hotel?.starCategory;
                            hotels[i].country = hotelData?.hotel?.country?.countryName;
                            hotels[i].state = hotelData?.hotel?.state?.stateName;
                            hotels[i].city = hotelData?.hotel?.city?.cityName;
                            hotels[i].cityId = hotelData?.hotel?.city?._id;
                            hotels[i].areaId = hotelData?.hotel?.area?._id;
                            hotels[i].area = hotelData?.hotel?.area?.areaName;
                            hotels[i].roomType = hotelData?.roomType?.roomName;
                            hotels[i].roomOccupancies = hotelData?.rates;
                            hotels[i].boardTypeCode = hotels[i].boardTypeCode;

                            totalNumDays += numDays;
                        }

                        let occupancyArr = occupancyArray.map((occpArray, index) => {
                            let totalPerPrice = occpArray.price;
                            let totalMarketMarkup = occpArray.marketMarkup || 0;
                            let totalProfileMarkup = occpArray.profileMarkup || 0;

                            let transferStay;
                            if (transferQuotation) {
                                transferStay = transferQuotation?.stayTransfers.find(
                                    (st) => st.stayNo === idx
                                );
                            }

                            if (
                                occpArray?.occupancyShortName?.toUpperCase() === "CNB" ||
                                occpArray?.occupancyShortName?.toUpperCase() === "CWB"
                            ) {
                                if (totalPerPrice != null && totalPerPrice >= 0) {
                                    totalPerPrice += Number(childrenTotalPrice);
                                    totalMarketMarkup += Number(totalChildMarketMarkup);
                                    totalProfileMarkup += Number(totalChildProfileMarkup);
                                }
                            } else {
                                if (totalPerPrice != null && totalPerPrice >= 0) {
                                    totalPerPrice += Number(adultTotalPrice);
                                    totalMarketMarkup += Number(totalAdultMarketMarkup);
                                    totalProfileMarkup += Number(totalAdultProfileMarkup);
                                }
                            }

                            let perPersonPriceWithTransfer;

                            let perPersonTotalPrice;
                            let perPersonMarketMarkup;
                            let perPersonProfileMarkup;

                            if (transferStay) {
                                perPersonTotalPrice =
                                    totalPerPrice >= 0 && totalPerPrice != null
                                        ? totalPerPrice /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;

                                perPersonMarketMarkup =
                                    totalMarketMarkup >= 0 && totalMarketMarkup != null
                                        ? Number(
                                              totalMarketMarkup +
                                                  transferStay.ppTotalMarketMarkupPerStayTransfer
                                          ) /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;
                                perPersonProfileMarkup =
                                    totalProfileMarkup >= 0 && totalProfileMarkup != null
                                        ? Number(
                                              totalProfileMarkup +
                                                  transferStay.ppTotalProfileMarkupPerStayTransfer
                                          ) /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;

                                perPersonPriceWithTransfer =
                                    totalPerPrice >= 0 && totalPerPrice != null
                                        ? Number(
                                              totalPerPrice +
                                                  transferStay.ppTotalPricePerStayTransfer
                                          ) /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;

                                perPersonPriceWithTransfer =
                                    perPersonPriceWithTransfer >= 0 &&
                                    perPersonPriceWithTransfer != null
                                        ? perPersonPriceWithTransfer
                                        : null;
                            } else {
                                perPersonTotalPrice =
                                    totalPerPrice >= 0 && totalPerPrice != null
                                        ? totalPerPrice /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;
                                perPersonMarketMarkup =
                                    totalMarketMarkup >= 0 && totalMarketMarkup != null
                                        ? Number(totalMarketMarkup) /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;
                                perPersonProfileMarkup =
                                    totalProfileMarkup >= 0 && totalProfileMarkup != null
                                        ? Number(totalProfileMarkup) /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;
                                perPersonPriceWithTransfer =
                                    totalPerPrice >= 0 && totalPerPrice != null
                                        ? Number(totalPerPrice) /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;

                                perPersonPriceWithTransfer =
                                    perPersonPriceWithTransfer >= 0 &&
                                    perPersonPriceWithTransfer != null
                                        ? perPersonPriceWithTransfer
                                        : null;
                            }

                            return {
                                ...occpArray,
                                price: perPersonTotalPrice != null ? perPersonTotalPrice : null,
                                priceWithTransfer:
                                    perPersonTotalPrice != null ? perPersonPriceWithTransfer : null,
                                perPersonProfileMarkup:
                                    perPersonTotalPrice != null ? perPersonProfileMarkup : null,
                                perPersonMarketMarkup:
                                    perPersonMarketMarkup != null ? perPersonMarketMarkup : null,
                            };
                        });

                        if (totalNumDays > noOfNights) {
                            return sendErrorResponse(
                                res,
                                400,
                                "Please fill dates fileds correctly"
                            );
                        }

                        filteredQuation[j].roomOccupancyList = occupancyArr;
                        idx++;
                    }

                    hotelQuotation = new HotelQuotation({
                        stays: filteredQuation,
                    });

                    await hotelQuotation.save();
                }
            }

            let quotationNumber;
            const oldquotations = await Quotation.find({}).sort({ quotationNumber: -1 }).limit(1);
            if (oldquotations?.length < 1) {
                quotationNumber = 100000;
            } else {
                quotationNumber = oldquotations[0].quotationNumber + 1;
            }

            const convertedAdultPrice =
                adultTotalPrice / (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1);
            const perPersonAdultPrice =
                convertedAdultPrice +
                (isCustomMarkup
                    ? customMarkupType?.toLowerCase() === "flat"
                        ? Number(customMarkup)
                        : (convertedAdultPrice / 100) * Number(customMarkup)
                    : 0);
            const convertedAdultMarketMarkup =
                totalAdultMarketMarkup / (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1);
            const perPersonAdultMarketMarkup = convertedAdultMarketMarkup;
            // (isCustomMarkup
            //     ? customMarkupType?.toLowerCase() === "flat"
            //         ? Number(customMarkup)
            //         : (convertedAdultMarketMarkup / 100) * Number(customMarkup)
            //     : 0);

            const convertedAdultProfileMarkup =
                totalAdultProfileMarkup / (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1);
            const perPersonAdultProfileMarkup = convertedAdultProfileMarkup;
            // (isCustomMarkup
            //     ? customMarkupType?.toLowerCase() === "flat"
            //         ? Number(customMarkup)
            //         : (convertedAdultProfileMarkup / 100) * Number(customMarkup)
            //     : 0);

            const convertedChildPrice =
                childrenTotalPrice / (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1);
            const perPersonChildPrice =
                convertedChildPrice +
                (isCustomMarkup
                    ? customMarkupType?.toLowerCase() === "flat"
                        ? Number(customMarkup)
                        : (convertedChildPrice / 100) * Number(customMarkup)
                    : 0);

            const convertedChildMarketMarkup =
                totalChildMarketMarkup / (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1);
            const perPersonChildMarketMarkup = convertedChildMarketMarkup;
            // (isCustomMarkup
            //     ? customMarkupType?.toLowerCase() === "flat"
            //         ? Number(customMarkup)
            //         : (convertedChildMarketMarkup / 100) * Number(customMarkup)
            //     : 0);

            const convertedChildProfileMarkup =
                totalChildProfileMarkup / (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1);
            const perPersonChildProfileMarkup = convertedChildProfileMarkup;
            // (isCustomMarkup
            //     ? customMarkupType?.toLowerCase() === "flat"
            //         ? Number(customMarkup)
            //         : (convertedChildProfileMarkup / 100) * Number(customMarkup)
            //     : 0);

            const newQuotationAmendment = new QuotationAmendment({
                reseller: req.reseller._id,
                createdBy: "reseller",
                noOfAdults,
                noOfChildren,
                childrenAges,
                checkInDate: formattedCheckInDate,
                checkOutDate: formattedCheckOutDate,
                noOfNights,
                paxType,
                arrivalAirport,
                departureAirport,
                isArrivalAirportDisabled,
                isDepartureAirportDisabled,
                arrivalIataCode: arrivalAirportDetails?.iataCode,
                departureIataCode: departureAirportDetails?.iataCode,
                arrivalAirportName: arrivalAirportDetails?.airportName,
                departureAirportName: departureAirportDetails?.airportName,
                hotelQuotation: hotelQuotation?._id,
                transferQuotation: transferQuotation?._id,
                excursionQuotation: excursionQuotation?._id,
                excSupplementQuotation: excSupplementQuotation?._id,
                quotationNumber,
                quotationCurrency,
                isVisaNeeded: visa ? true : false,
                visa: visa
                    ? {
                          visaId,
                          name: visa?.visaName,
                          country: visa?.visa,
                          nationality: selectedVisaNationality,
                          adultPrice: visa.adultPrice,
                          childPrice: visa.childPrice,
                          adultCost: visa.adultCost,
                          childCost: visa.childCost,
                          adultMarketMarkup: visa.adultMarketMarkup,
                          adultProfileMarkup: visa.adultProfileMarkup,
                          childMarketMarkup: visa.childMarketMarkup,
                          childProfileMarkup: visa.childProfileMarkup,
                          otbPrice: otbPrice ? Number(otbPrice) : 0,
                      }
                    : undefined,
                isTransferQuotationDisabled,
                isVisaQuotationDisabled,
                isHotelQuotationDisabled,
                isSupplimentQuotationDisabled,
                isExcursionQuotationDisabled,
                hotelDisabledRemark: isHotelQuotationDisabled ? hotelDisabledRemark : undefined,
                perPersonAdultPrice,
                perPersonChildPrice,
                perPersonAdultMarketMarkup,
                perPersonAdultProfileMarkup,
                perPersonChildMarketMarkup,
                perPersonChildProfileMarkup,
                clientName,
                isResellerDisabled: false,
                isAlreadyBooked,
                departureTerminalId,
                departureTerminalCode,
                arrivalTerminalId,
                arrivalTerminalCode,
                status: "not-confirmed",
                pickupPlaceId,
                pickupNote,
            });

            await newQuotationAmendment.save();
            const newQuotation = new Quotation({
                reseller: req.reseller._id,
                isResellerDisabled: false,
                amendment: newQuotationAmendment._id,
                totalAmendments: 1,
                quotationNumber,
                agentQuotationNumber,
            });

            await newQuotation.save();

            const quotationSheet = await createQtnSheet({
                quotationNumber,
                // agentQuotationNumber,
                totalPax,
                noOfAdults,
                noOfChildren,
                transferQuotation,
                hotelQuotation,
                excursionQuotation,
                visa,
                quotationCurrency,
                amendmentNo: newQuotation.totalAmendments,
                perPersonAdultPrice,
                perPersonChildPrice,
                perPersonAdultMarketMarkup,
                perPersonAdultProfileMarkup,
                perPersonChildMarketMarkup,
                perPersonChildProfileMarkup,
                agent: req.user,
                noOfNights,
                checkInDate,
                checkOutDate,
                otbPrice,
                isTransferQuotationDisabled,
                isHotelQuotationDisabled,
                isSupplimentQuotationDisabled,
                isExcursionQuotationDisabled,
            });

            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            let pdfPath = "/public/pdf/quotation" + uniqueSuffix + ".pdf";
            await createPdf({
                path: pdfPath,
                reseller: req.reseller,
                amendment: newQuotationAmendment,
                excursionQuotation,
                hotelQuotation,
                quotation: newQuotation,
                transferQuotation,
                excSupplementQuotation,
            });

            const adminAccess = await AdminB2bAccess.findOne({
                reseller: req.reseller._id,
            }).populate("quotations");

            if (adminAccess) {
                for (let i = 0; i < adminAccess?.quotations?.length; i++) {
                    await sentQuotationEmail({
                        path: pdfPath,
                        reseller: adminAccess.quotations[i],
                        amendment: newQuotationAmendment,
                        excursionQuotation,
                        hotelQuotation,
                        quotation: newQuotation,
                        transferQuotation,
                        excSupplementQuotation,
                    });
                }
            }

            await sentQuotationEmail({
                path: pdfPath,
                reseller: req.reseller,
                amendment: newQuotationAmendment,
                excursionQuotation,
                hotelQuotation,
                quotation: newQuotation,
                transferQuotation,
                excSupplementQuotation,
            });

            newQuotationAmendment.sheet = quotationSheet;
            newQuotationAmendment.pdf = pdfPath;
            await newQuotationAmendment.save();

            res.status(200).json({
                quotationNumber,
                message: "Quotation created successfully",
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    updateQuotation: async (req, res) => {
        try {
            const { quotationNumber } = req.params;

            const {
                clientName,
                noOfAdults,
                noOfChildren,
                agentQuotationNumber,
                childrenAges,
                checkInDate,
                checkOutDate,
                paxType,
                arrivalAirport,
                departureAirport,
                isArrivalAirportDisabled,
                isDepartureAirportDisabled,
                isHotelQuotationDisabled,
                isSupplimentQuotationDisabled = false,
                isExcursionQuotationDisabled = false,
                stays,
                isTransferQuotationDisabled,
                transfer,
                isVisaQuotationDisabled,
                visaId,
                selectedExcursionType,
                selectedExcursionTypeSuppliments,
                otbPrice,
                hotelDisabledRemark,
                isAlreadyBooked,
                isResellerDisabled,
                quotationCurrency = "AED",
                departureTerminalId,
                departureTerminalCode,
                arrivalTerminalId,
                arrivalTerminalCode,
                selectedVisaNationality,
                isCustomMarkup = false,
                pickupPlaceId,
                pickupNote,
            } = req.body;

            const quotation = await Quotation.findOne({
                quotationNumber,
            });

            if (!noOfAdults) {
                return sendErrorResponse(res, 400, "no of adults is required");
            }

            if (Number(noOfAdults) < 1) {
                return sendErrorResponse(
                    res,
                    400,
                    "No of adults should be greater than or equal to 1"
                );
            }

            if (noOfChildren && Number(noOfChildren) < 1) {
                return sendErrorResponse(
                    res,
                    400,
                    "No of children should be greater than or equal to 1"
                );
            }

            let totalPax =
                (noOfAdults ? Number(noOfAdults) : 0) + (noOfChildren ? Number(noOfChildren) : 0);

            if (totalPax <= 0) {
                return sendErrorResponse(
                    res,
                    400,
                    "The total no of pax should be greater than or equal to one"
                );
            }

            const formattedCheckInDate = new Date(checkInDate).toISOString().substring(0, 10);
            const formattedCheckOutDate = new Date(checkOutDate).toISOString().substring(0, 10);

            if (!formattedCheckOutDate || !formattedCheckInDate) {
                return sendErrorResponse(res, 400, "checkin and checkout is required");
            }

            const diffTime = Math.abs(
                new Date(formattedCheckOutDate) - new Date(formattedCheckInDate)
            );
            const noOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (noOfNights < 1) {
                return sendErrorResponse(
                    res,
                    400,
                    "number of nights should be greater than or equal to one"
                );
            }

            let arrivalAirportDetails;
            if (isArrivalAirportDisabled === false) {
                arrivalAirportDetails = await Airport.findById(arrivalAirport);

                if (!arrivalAirportDetails) {
                    return sendErrorResponse(res, 400, "arrival airport details not found");
                }
            }

            let departureAirportDetails;
            if (isDepartureAirportDisabled === false) {
                departureAirportDetails = await Airport.findById(departureAirport);

                if (!departureAirportDetails) {
                    return sendErrorResponse(res, 400, "arrival airport details not found");
                }
            }

            let profileMarkup;
            let market = req?.reseller?.marketStrategy;

            let profile = await B2BMarkupProfile.findOne({ resellerId: req.reseller._id });

            if (profile && profile?.quotation) {
                profileMarkup = profile;
            }

            let excursionAdultTotal = 0;
            let excursionChildTotal = 0;
            let excursionPvtTransferTotal = 0;
            let excursionAdultTotalCost = 0;
            let excursionChildTotalCost = 0;
            let totalPvtTransferTotalCost = 0;
            let adultMarketMarkupTotal = 0;
            let childMarketMarkupTotal = 0;
            let pvtTransferMarketMarkupTotal = 0;
            let adultProfileMarkupTotal = 0;
            let childProfileMarkupTotal = 0;
            let pvtTransferProfileMarkupTotal = 0;

            let excursionQuotation;

            if (isExcursionQuotationDisabled === false) {
                if (selectedExcursionType?.length > 0) {
                    const filteredExcursions = selectedExcursionType?.filter((item) => {
                        if (item?.excursionId && item?.value) {
                            return item;
                        }
                        return "";
                    });

                    if (filteredExcursions?.length > 0) {
                        for (let i = 0; i < filteredExcursions?.length; i++) {
                            let excursionAdultCost = 0;
                            let excursionChildCost = 0;
                            let pvtTransferCost = 0;

                            const excursions = await Excursion.aggregate([
                                {
                                    $match: {
                                        activityId: Types.ObjectId(
                                            filteredExcursions[i]?.excursionId
                                        ),
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
                                        activity: {
                                            $arrayElemAt: ["$activity", 0],
                                        },
                                    },
                                },
                            ]);

                            let excursion = excursions[0];

                            if (!excursion) {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "You selected an invalid excursion. Please double check and try again"
                                );
                            }

                            const vehicleType = filteredExcursions[i].vehicleType;

                            let transferType = "without";

                            if (
                                excursion?.excursionType === "transfer" &&
                                filteredExcursions[i]?.value.toLowerCase() === "private"
                            ) {
                                if (vehicleType && vehicleType.length < 1) {
                                    return sendErrorResponse(
                                        res,
                                        400,
                                        `please select a transfer type in ${excursion?.name}`
                                    );
                                }

                                for (let j = 0; j < vehicleType.length; j++) {
                                    let selectedDate =
                                        excursion?.transferPricing?.privateTransfer?.find((pvt) => {
                                            return (
                                                new Date(checkInDate) >= new Date(pvt?.fromDate) &&
                                                new Date(checkInDate) <= new Date(pvt?.toDate)
                                            );
                                        });

                                    if (!selectedDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                        );
                                    }

                                    const selectedVehicleType = selectedDate?.vehicleType?.find(
                                        (vehTY) => {
                                            return (
                                                vehTY?.vehicle?.toString() ===
                                                vehicleType[j]?.vehicle?.toString()
                                            );
                                        }
                                    );

                                    if (!selectedVehicleType) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `please select a vehicle type in ${excursion?.activity?.name}`
                                        );
                                    }

                                    let pvtTransferPrice =
                                        selectedVehicleType?.price * Number(vehicleType[j].count);

                                    pvtTransferCost = pvtTransferPrice / Number(totalPax);

                                    vehicleType[j].vehicleName = selectedVehicleType.vehicle.name;
                                }
                                transferType = "private";
                            } else if (
                                excursion?.excursionType === "transfer" &&
                                filteredExcursions[i]?.value.toLowerCase() === "shared"
                            ) {
                                if (!excursion?.transferPricing?.sicPrice) {
                                    return sendErrorResponse(
                                        res,
                                        400,
                                        `sic transfer not available in ${excursion?.excursionName}`
                                    );
                                }

                                let selectedExcursionDate =
                                    excursion?.transferPricing?.sicPrice?.find((scPrice) => {
                                        return (
                                            new Date(checkInDate) >= new Date(scPrice.fromDate) &&
                                            new Date(checkInDate) <= new Date(scPrice.toDate)
                                        );
                                    });

                                if (!selectedExcursionDate) {
                                    return sendErrorResponse(
                                        res,
                                        400,
                                        `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                    );
                                }

                                // const sicPriceWithMarkup =
                                //     profileMarkup && !isCustomMarkup
                                //         ? profileMarkup.landmarkMarkupType === "percentage"
                                //             ? (excursion?.transferPricing?.sicPrice / 100) *
                                //                   profileMarkup.landmarkMarkup +
                                //               excursion?.transferPricing?.sicPrice
                                //             : excursion?.transferPricing?.sicPrice +
                                //               profileMarkup.landmarkMarkup
                                //         : excursion?.transferPricing?.sicPrice;

                                excursionAdultCost = selectedExcursionDate.price;
                                excursionChildCost = selectedExcursionDate.price;
                                // excursionAdultPriceWithoutMarkup +=
                                //     excursion?.transferPricing?.sicPrice;
                                // excursionChildPriceWithoutMarkup +=
                                //     excursion?.transferPricing?.sicPrice;
                                transferType = "shared";
                            } else if (excursion?.excursionType === "ticket") {
                                if (filteredExcursions[i]?.value.toLowerCase() === "ticket") {
                                    let selectedExcursionDate =
                                        excursion.ticketPricing.ticketPrice.find((tktPrice) => {
                                            return (
                                                new Date(checkInDate) >=
                                                    new Date(tktPrice.fromDate) &&
                                                new Date(checkInDate) <= new Date(tktPrice.toDate)
                                            );
                                        });

                                    if (!selectedExcursionDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                        );
                                    }
                                    excursionAdultCost = selectedExcursionDate?.adultPrice;

                                    excursionChildCost = selectedExcursionDate?.childPrice;
                                } else if (
                                    filteredExcursions[i]?.value.toLowerCase() === "shared"
                                ) {
                                    let selectedExcursionDate =
                                        excursion.ticketPricing.sicWithTicket.find((sicPrice) => {
                                            return (
                                                new Date(checkInDate) >=
                                                    new Date(sicPrice.fromDate) &&
                                                new Date(checkInDate) <= new Date(sicPrice.toDate)
                                            );
                                        });

                                    if (!selectedExcursionDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.name} . please choose some other excursion`
                                        );
                                    }
                                    if (
                                        selectedExcursionDate?.adultPrice &&
                                        selectedExcursionDate?.childPrice
                                    ) {
                                        excursionAdultCost = selectedExcursionDate?.adultPrice;
                                        excursionChildCost = selectedExcursionDate?.childPrice;
                                        transferType = "shared";
                                    } else {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            "Excursion's SIC price not provided"
                                        );
                                    }
                                } else if (
                                    filteredExcursions[i]?.value.toLowerCase() === "private"
                                ) {
                                    let selectedExcursionDate =
                                        excursion.ticketPricing.ticketPrice.find((tktPrice) => {
                                            return (
                                                new Date(checkInDate) >=
                                                    new Date(tktPrice.fromDate) &&
                                                new Date(checkInDate) <= new Date(tktPrice.toDate)
                                            );
                                        });

                                    if (!selectedExcursionDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                        );
                                    }
                                    excursionAdultCost = selectedExcursionDate?.adultPrice;

                                    excursionChildCost = selectedExcursionDate?.childPrice;
                                    if (!vehicleType && vehicleType.length < 1) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `please select a transfer type in ${excursion?.activity?.name}`
                                        );
                                    }

                                    for (let j = 0; j < vehicleType.length; j++) {
                                        let selectedDate =
                                            excursion?.ticketPricing?.privateTransfer?.find(
                                                (pvt) => {
                                                    return (
                                                        new Date(checkInDate) >=
                                                            new Date(pvt?.fromDate) &&
                                                        new Date(checkInDate) <=
                                                            new Date(pvt?.toDate)
                                                    );
                                                }
                                            );

                                        if (!selectedDate) {
                                            return sendErrorResponse(
                                                res,
                                                400,
                                                `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                            );
                                        }

                                        const selectedVehicleType = selectedDate?.vehicleType?.find(
                                            (vehTY) => {
                                                return (
                                                    vehTY?.vehicle?.toString() ===
                                                    vehicleType[j]?.vehicle?.toString()
                                                );
                                            }
                                        );

                                        if (!selectedVehicleType) {
                                            return sendErrorResponse(
                                                res,
                                                400,
                                                `please select a vehicle type in ${excursion?.activity?.name}`
                                            );
                                        }

                                        let pvtTransferPrice =
                                            Number(selectedVehicleType?.price) *
                                            Number(vehicleType[j].count);

                                        pvtTransferCost += pvtTransferPrice / Number(totalPax);

                                        vehicleType[j].vehicleName =
                                            selectedVehicleType.vehicle.name;
                                    }

                                    transferType = "private";
                                }
                            } else {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "Something went wrong on excursion quotation. Please try again"
                                );
                            }

                            const selectedMarketPrice = market?.activities?.find((act) => {
                                return (
                                    act?.activity?.toString() === excursion?.activityId?.toString()
                                );
                            });

                            const adultMarketMarkup =
                                market && selectedMarketPrice
                                    ? filteredExcursions[i]?.value?.toLowerCase() === "private" &&
                                      excursion?.excursionType === "transfer"
                                        ? 0
                                        : selectedMarketPrice.markupType === "percentage"
                                        ? (excursionAdultCost / 100) * selectedMarketPrice.markup
                                        : selectedMarketPrice.markup
                                    : 0;

                            const childMarketMarkup =
                                market && selectedMarketPrice
                                    ? filteredExcursions[i]?.value?.toLowerCase() === "private" &&
                                      excursion?.excursionType.toLowerCase() === "transfer"
                                        ? 0
                                        : selectedMarketPrice.markupType === "percentage"
                                        ? (excursionChildCost / 100) * selectedMarketPrice.markup
                                        : selectedMarketPrice.markup
                                    : 0;

                            const pvtTransferMarketMarkup =
                                market &&
                                selectedMarketPrice &&
                                filteredExcursions[i]?.value?.toLowerCase() === "private"
                                    ? selectedMarketPrice?.transferMarkupType === "percentage"
                                        ? (pvtTransferCost / 100) *
                                          selectedMarketPrice.transferMarkup
                                        : selectedMarketPrice.transferMarkup
                                    : 0;

                            let excursionAdultPrice = excursionAdultCost + adultMarketMarkup;
                            let excursionChildPrice = excursionChildCost + childMarketMarkup;
                            let pvtTransferPrice =
                                filteredExcursions[i].value.toLowerCase() === "private"
                                    ? pvtTransferCost + pvtTransferMarketMarkup
                                    : 0;

                            filteredExcursions[i].adultCost = excursionAdultCost;
                            filteredExcursions[i].childCost = excursionChildCost;
                            filteredExcursions[i].pvtTransferCost = pvtTransferCost;
                            filteredExcursions[i].adultPrice = excursionAdultPrice;
                            filteredExcursions[i].childPrice = excursionChildPrice;
                            filteredExcursions[i].pvtTransferPrice = pvtTransferPrice;

                            filteredExcursions[i].adultMarketMarkup = adultMarketMarkup;
                            filteredExcursions[i].childMarketMarkup = childMarketMarkup;
                            filteredExcursions[i].pvtTransferMarketMarkup = pvtTransferMarketMarkup;
                            filteredExcursions[i].excursionName = excursion.activity.name;
                            filteredExcursions[i].excursionType = excursion.excursionType;
                            filteredExcursions[i].transferType = transferType;
                            filteredExcursions[i].value = filteredExcursions[i].value.toLowerCase();

                            excursionAdultTotal += excursionAdultPrice;
                            excursionChildTotal += excursionChildPrice;
                            excursionPvtTransferTotal += pvtTransferPrice;
                            adultMarketMarkupTotal += adultMarketMarkup;
                            childMarketMarkupTotal += childMarketMarkup;
                            pvtTransferMarketMarkupTotal +=
                                filteredExcursions[i].value.toLowerCase() === "private"
                                    ? pvtTransferMarketMarkup
                                    : 0;
                        }

                        const adultProfileMarkup =
                            profileMarkup && profileMarkup.quotation && !isCustomMarkup
                                ? profileMarkup.quotation.landAttractionMarkupType === "percentage"
                                    ? (excursionAdultTotal + adultMarketMarkupTotal / 100) *
                                      profileMarkup.quotation.landAttractionMarkup
                                    : profileMarkup.quotation.landAttractionMarkup
                                : 0;

                        const childProfileMarkup =
                            profileMarkup && profileMarkup.quotation && !isCustomMarkup
                                ? profileMarkup.quotation.landAttractionMarkupType === "percentage"
                                    ? (excursionChildTotal + childMarketMarkupTotal / 100) *
                                      profileMarkup.quotation.landAttractionMarkup
                                    : profileMarkup.quotation.landAttractionMarkup
                                : 0;

                        const pvtTransferProfileMarkup =
                            profileMarkup &&
                            profileMarkup.quotation &&
                            !isCustomMarkup &&
                            excursionPvtTransferTotal !== 0
                                ? profileMarkup.quotation.landTransferMarkupType === "percentage"
                                    ? (excursionPvtTransferTotal +
                                          pvtTransferMarketMarkupTotal / 100) *
                                      profileMarkup.quotation.landTransferMarkup
                                    : profileMarkup.quotation.landTransferMarkup
                                : 0;

                        excursionAdultTotal =
                            excursionAdultTotal +
                            adultProfileMarkup +
                            excursionPvtTransferTotal +
                            pvtTransferProfileMarkup;

                        excursionChildTotal =
                            excursionChildTotal +
                            childProfileMarkup +
                            excursionPvtTransferTotal +
                            pvtTransferProfileMarkup;

                        excursionQuotation = new ExcursionQuotation({
                            excursions: [...filteredExcursions],
                            adultTotal: excursionAdultTotal,
                            childrenTotal: excursionChildTotal,
                            adultProfileMarkup: adultProfileMarkup,
                            childProfileMarkup: childProfileMarkup,
                            pvtTransferProfileMarkup: pvtTransferProfileMarkup,
                            adultMarketMarkup: adultMarketMarkupTotal,
                            childMarketMarkup: childMarketMarkupTotal,
                            pvtTransferMarketMarkup: pvtTransferMarketMarkupTotal,
                        });

                        adultProfileMarkupTotal += adultProfileMarkup;
                        childProfileMarkupTotal += childProfileMarkup;
                        pvtTransferProfileMarkupTotal += pvtTransferProfileMarkup;
                        await excursionQuotation.save();
                    }
                }
            }

            let supplementAdultTotal = 0;
            let supplementChildTotal = 0;
            let SupplementPvtTransferTotal = 0;
            let SupplementAdultTotalCost = 0;
            let SupplementChildTotalCost = 0;
            let totalSupplementPvtTransferTotalCost = 0;
            let adultSupplementMarketMarkupTotal = 0;
            let childSupplementMarketMarkupTotal = 0;
            let pvtSupplementTransferMarketMarkupTotal = 0;
            let adultSupplementProfileMarkupTotal = 0;
            let childSupplementProfileMarkupTotal = 0;
            let pvtSupplementTransferProfileMarkupTotal = 0;

            let excSupplementQuotation;
            if (isSupplimentQuotationDisabled === false) {
                if (selectedExcursionTypeSuppliments?.length > 0) {
                    const filteredExcursions = selectedExcursionTypeSuppliments?.filter((item) => {
                        if (item?.excursionId && item?.value) {
                            return item;
                        }
                        return "";
                    });

                    if (filteredExcursions?.length > 0) {
                        for (let i = 0; i < filteredExcursions?.length; i++) {
                            let excursionAdultCost = 0;
                            let excursionChildCost = 0;
                            let pvtTransferCost = 0;

                            const excursions = await Excursion.aggregate([
                                {
                                    $match: {
                                        activityId: Types.ObjectId(
                                            filteredExcursions[i]?.excursionId
                                        ),
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
                                        activity: {
                                            $arrayElemAt: ["$activity", 0],
                                        },
                                    },
                                },
                            ]);

                            let excursion = excursions[0];

                            // Now 'excursion' contains the populated vehicle information

                            if (!excursion) {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "You selected an invalid excursion. Please double check and try again"
                                );
                            }

                            const vehicleType = filteredExcursions[i].vehicleType;

                            let transferType = "without";

                            if (
                                excursion?.excursionType === "transfer" &&
                                filteredExcursions[i]?.value.toLowerCase() === "private"
                            ) {
                                if (vehicleType && vehicleType.length < 1) {
                                    return sendErrorResponse(
                                        res,
                                        400,
                                        `please select a transfer type in ${excursion?.name}`
                                    );
                                }

                                for (let j = 0; j < vehicleType.length; j++) {
                                    let selectedDate =
                                        excursion?.transferPricing?.privateTransfer?.find((pvt) => {
                                            return (
                                                new Date(checkInDate) >= new Date(pvt?.fromDate) &&
                                                new Date(checkInDate) <= new Date(pvt?.toDate)
                                            );
                                        });

                                    if (!selectedDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                        );
                                    }

                                    const selectedVehicleType = selectedDate?.vehicleType?.find(
                                        (vehTY) => {
                                            return (
                                                vehTY?.vehicle?.toString() ===
                                                vehicleType[j]?.vehicle?.toString()
                                            );
                                        }
                                    );

                                    if (!selectedVehicleType) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `please select a vehicle type in ${excursion?.activity?.name}`
                                        );
                                    }

                                    let pvtTransferPrice =
                                        selectedVehicleType?.price * Number(vehicleType[j].count);

                                    pvtTransferCost = pvtTransferPrice / Number(totalPax);

                                    vehicleType[j].vehicleName = selectedVehicleType.vehicle.name;
                                }
                                transferType = "private";
                            } else if (
                                excursion?.excursionType === "transfer" &&
                                filteredExcursions[i]?.value.toLowerCase() === "shared"
                            ) {
                                if (!excursion?.transferPricing?.sicPrice) {
                                    return sendErrorResponse(
                                        res,
                                        400,
                                        `sic transfer not available in ${excursion?.excursionName}`
                                    );
                                }

                                let selectedExcursionDate =
                                    excursion?.transferPricing?.sicPrice?.find((scPrice) => {
                                        return (
                                            new Date(checkInDate) >= new Date(scPrice.fromDate) &&
                                            new Date(checkInDate) <= new Date(scPrice.toDate)
                                        );
                                    });

                                if (!selectedExcursionDate) {
                                    return sendErrorResponse(
                                        res,
                                        400,
                                        `no availabilty for excursion  ${excursion?.name} . please choose some other excursion`
                                    );
                                }

                                // const sicPriceWithMarkup =
                                //     profileMarkup && !isCustomMarkup
                                //         ? profileMarkup.landmarkMarkupType === "percentage"
                                //             ? (excursion?.transferPricing?.sicPrice / 100) *
                                //                   profileMarkup.landmarkMarkup +
                                //               excursion?.transferPricing?.sicPrice
                                //             : excursion?.transferPricing?.sicPrice +
                                //               profileMarkup.landmarkMarkup
                                //         : excursion?.transferPricing?.sicPrice;

                                excursionAdultCost = selectedExcursionDate.price;
                                excursionChildCost = selectedExcursionDate.price;
                                // excursionAdultPriceWithoutMarkup +=
                                //     excursion?.transferPricing?.sicPrice;
                                // excursionChildPriceWithoutMarkup +=
                                //     excursion?.transferPricing?.sicPrice;
                                transferType = "shared";
                            } else if (excursion?.excursionType === "ticket") {
                                if (filteredExcursions[i]?.value.toLowerCase() === "ticket") {
                                    let selectedExcursionDate =
                                        excursion.ticketPricing.ticketPrice.find((tktPrice) => {
                                            return (
                                                new Date(checkInDate) >=
                                                    new Date(tktPrice.fromDate) &&
                                                new Date(checkInDate) <= new Date(tktPrice.toDate)
                                            );
                                        });

                                    if (!selectedExcursionDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                        );
                                    }
                                    excursionAdultCost = selectedExcursionDate?.adultPrice;

                                    excursionChildCost = selectedExcursionDate?.childPrice;
                                } else if (
                                    filteredExcursions[i]?.value.toLowerCase() === "shared"
                                ) {
                                    let selectedExcursionDate =
                                        excursion.ticketPricing.sicWithTicket.find((sicPrice) => {
                                            return (
                                                new Date(checkInDate) >=
                                                    new Date(sicPrice.fromDate) &&
                                                new Date(checkInDate) <= new Date(sicPrice.toDate)
                                            );
                                        });

                                    if (!selectedExcursionDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.name} . please choose some other excursion`
                                        );
                                    }
                                    if (
                                        selectedExcursionDate?.adultPrice &&
                                        selectedExcursionDate?.childPrice
                                    ) {
                                        excursionAdultCost = selectedExcursionDate?.adultPrice;
                                        excursionChildCost = selectedExcursionDate?.childPrice;
                                        transferType = "shared";
                                    } else {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            "Excursion's SIC price not provided"
                                        );
                                    }
                                } else if (
                                    filteredExcursions[i]?.value.toLowerCase() === "private"
                                ) {
                                    let selectedExcursionDate =
                                        excursion.ticketPricing.ticketPrice.find((tktPrice) => {
                                            return (
                                                new Date(checkInDate) >=
                                                    new Date(tktPrice.fromDate) &&
                                                new Date(checkInDate) <= new Date(tktPrice.toDate)
                                            );
                                        });

                                    if (!selectedExcursionDate) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                        );
                                    }
                                    excursionAdultCost = selectedExcursionDate?.adultPrice;

                                    excursionChildCost = selectedExcursionDate?.childPrice;
                                    if (!vehicleType && vehicleType.length < 1) {
                                        return sendErrorResponse(
                                            res,
                                            400,
                                            `please select a transfer type in ${excursion?.name}`
                                        );
                                    }

                                    for (let j = 0; j < vehicleType.length; j++) {
                                        let selectedDate =
                                            excursion?.ticketPricing?.privateTransfer?.find(
                                                (pvt) => {
                                                    return (
                                                        new Date(checkInDate) >=
                                                            new Date(pvt?.fromDate) &&
                                                        new Date(checkInDate) <=
                                                            new Date(pvt?.toDate)
                                                    );
                                                }
                                            );

                                        if (!selectedDate) {
                                            return sendErrorResponse(
                                                res,
                                                400,
                                                `no availabilty for excursion  ${excursion?.activity?.name} . please choose some other excursion`
                                            );
                                        }

                                        const selectedVehicleType = selectedDate?.vehicleType?.find(
                                            (vehTY) => {
                                                return (
                                                    vehTY?.vehicle?.toString() ===
                                                    vehicleType[j]?.vehicle?.toString()
                                                );
                                            }
                                        );

                                        if (!selectedVehicleType) {
                                            return sendErrorResponse(
                                                res,
                                                400,
                                                `please select a vehicle type in ${excursion?.activity?.name}`
                                            );
                                        }

                                        let pvtTransferPrice =
                                            Number(selectedVehicleType?.price) *
                                            Number(vehicleType[j].count);

                                        pvtTransferCost += pvtTransferPrice / Number(totalPax);

                                        vehicleType[j].vehicleName =
                                            selectedVehicleType.vehicle.name;
                                    }

                                    transferType = "private";
                                }
                            } else {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "Something went wrong on excursion quotation. Please try again"
                                );
                            }

                            const selectedMarketPrice = market?.activities?.find((act) => {
                                return (
                                    act?.activity?.toString() === excursion?.activityId?.toString()
                                );
                            });

                            const selectedProfilePrice = profileMarkup?.activities?.find((act) => {
                                return (
                                    act?.activity?.toString() === excursion?.activityId?.toString()
                                );
                            });

                            let excursionAdultPrice = 0;
                            let excursionChildPrice = 0;
                            let adultMarketMarkup = 0;
                            let childMarketMarkup = 0;
                            let pvtTransferMarketMarkup = 0;
                            let adultProfileMarkup = 0;
                            let childProfileMarkup = 0;
                            let pvtTransferPrice = 0;

                            adultMarketMarkup =
                                market && selectedMarketPrice
                                    ? filteredExcursions[i]?.value?.toLowerCase() === "private" &&
                                      excursion?.excursionType === "transfer"
                                        ? 0
                                        : selectedMarketPrice.markupType === "percentage"
                                        ? (excursionAdultCost / 100) * selectedMarketPrice.markup
                                        : selectedMarketPrice.markup
                                    : 0;

                            childMarketMarkup =
                                market && selectedMarketPrice
                                    ? filteredExcursions[i]?.value?.toLowerCase() === "private" &&
                                      excursion?.excursionType.toLowerCase() === "transfer"
                                        ? 0
                                        : selectedMarketPrice.markupType === "percentage"
                                        ? (excursionChildCost / 100) * selectedMarketPrice.markup
                                        : selectedMarketPrice.markup
                                    : 0;

                            pvtTransferMarketMarkup =
                                market &&
                                selectedMarketPrice &&
                                filteredExcursions[i]?.value?.toLowerCase() === "private"
                                    ? selectedMarketPrice?.transferMarkupType === "percentage"
                                        ? (pvtTransferCost / 100) *
                                          selectedMarketPrice?.transferMarkup
                                        : selectedMarketPrice?.transferMarkup
                                    : 0;

                            excursionAdultPrice =
                                Number(excursionAdultCost) +
                                Number(adultMarketMarkup) +
                                Number(pvtTransferCost) +
                                Number(pvtTransferMarketMarkup);
                            excursionChildPrice =
                                Number(excursionChildCost) +
                                Number(childMarketMarkup) +
                                Number(pvtTransferCost) +
                                Number(pvtTransferMarketMarkup);
                            pvtTransferPrice =
                                Number(pvtTransferCost) + Number(pvtTransferMarketMarkup);

                            adultProfileMarkup =
                                profileMarkup && selectedProfilePrice
                                    ? filteredExcursions[i]?.value?.toLowerCase() === "private" &&
                                      excursion?.excursionType === "transfer"
                                        ? 0
                                        : selectedProfilePrice?.markupType === "percentage"
                                        ? (excursionAdultPrice / 100) * selectedProfilePrice?.markup
                                        : selectedProfilePrice?.markup
                                    : 0;

                            childProfileMarkup =
                                profileMarkup && selectedProfilePrice
                                    ? filteredExcursions[i]?.value?.toLowerCase() === "private" &&
                                      excursion?.excursionType.toLowerCase() === "transfer"
                                        ? 0
                                        : selectedProfilePrice.markupType === "percentage"
                                        ? (excursionChildPrice / 100) * selectedProfilePrice.markup
                                        : selectedProfilePrice.markup
                                    : 0;

                            excursionAdultPrice += adultProfileMarkup;
                            excursionChildPrice += childProfileMarkup;

                            filteredExcursions[i].adultCost = excursionAdultCost;
                            filteredExcursions[i].childCost = excursionChildCost;
                            filteredExcursions[i].pvtTransferCost = pvtTransferCost;
                            filteredExcursions[i].adultPrice = excursionAdultPrice;
                            filteredExcursions[i].childPrice = excursionChildPrice;
                            filteredExcursions[i].pvtTransferPrice = pvtTransferPrice;
                            filteredExcursions[i].adultMarketMarkup = adultMarketMarkup;
                            filteredExcursions[i].childMarketMarkup = childMarketMarkup;
                            filteredExcursions[i].pvtTransferMarketMarkup = pvtTransferMarketMarkup;
                            filteredExcursions[i].excursionName = excursion.activity.name;
                            filteredExcursions[i].excursionType = excursion.excursionType;
                            filteredExcursions[i].transferType = transferType;
                            filteredExcursions[i].value = filteredExcursions[i].value;
                            filteredExcursions[i].adultProfileMarkup = adultProfileMarkup;
                            filteredExcursions[i].childProfileMarkup = childProfileMarkup;
                            supplementAdultTotal += excursionAdultPrice;
                            supplementChildTotal += excursionChildPrice;
                            SupplementPvtTransferTotal += pvtTransferPrice;
                            adultSupplementMarketMarkupTotal += adultMarketMarkup;
                            childSupplementMarketMarkupTotal += childMarketMarkup;
                            pvtSupplementTransferMarketMarkupTotal += pvtTransferMarketMarkup;
                        }

                        excSupplementQuotation = new ExcSupplementsQuotation({
                            excursions: [...filteredExcursions],
                        });

                        await excSupplementQuotation.save();
                    }
                }
            }

            let visa;
            if (isVisaQuotationDisabled === false) {
                if (!isValidObjectId(visaId)) {
                    return sendErrorResponse(res, 400, "invalid visa or add  visa quotation ");
                }

                if (!isValidObjectId(selectedVisaNationality)) {
                    return sendErrorResponse(
                        res,
                        400,
                        "invalid visa nationality or add  visa nationality "
                    );
                }

                const visaResponse = await VisaType.aggregate([
                    { $match: { _id: Types.ObjectId(visaId), isDeleted: false } },
                    {
                        $lookup: {
                            from: "visas",
                            localField: "visa",
                            foreignField: "_id",
                            as: "visaCountry",
                        },
                    },
                    {
                        $project: {
                            markup: 0,
                        },
                    },
                ]);

                const visaNationality = await VisaNationality.findOne({
                    isDeleted: false,
                    _id: selectedVisaNationality,
                });

                const selectedVisaType = visaNationality.visas.find(
                    (visa) =>
                        visa.visaType.toString() === visaId.toString() &&
                        !visa.isDeleted &&
                        visa?.createdFor.toLocaleLowerCase() === "quotation"
                );

                if (!selectedVisaType) {
                    return sendErrorResponse(
                        res,
                        400,
                        "invalid visa type or add  visa type not found  "
                    );
                }

                if (!visaResponse || visaResponse?.length < 1) {
                    return sendErrorResponse(
                        res,
                        400,
                        "Invalid visa id, Please check and try again"
                    );
                }
                visa = visaResponse[0];
                const selectedMarketPrice = market?.visa?.find((vs) => {
                    return vs?.visa?.toString() === visaId?.toString();
                });
                visa.adultMarketMarkup =
                    market && selectedMarketPrice
                        ? selectedMarketPrice.markupType === "percentage"
                            ? (selectedVisaType.adultPrice / 100) * selectedMarketPrice.markup
                            : selectedMarketPrice.markup
                        : 0;

                visa.childMarketMarkup =
                    market && selectedMarketPrice
                        ? selectedMarketPrice.markupType === "percentage"
                            ? (selectedVisaType.childPrice / 100) * selectedMarketPrice.markup
                            : selectedMarketPrice.markup
                        : 0;

                visa.adultProfileMarkup =
                    profileMarkup && profileMarkup.quotation && !isCustomMarkup
                        ? profileMarkup.quotation.visaMarkupType === "percentage"
                            ? ((selectedVisaType.adultPrice + visa.adultMarketMarkup) / 100) *
                              profileMarkup.quotation.visaMarkup
                            : profileMarkup.quotation.visaMarkup
                        : 0;

                visa.childProfileMarkup =
                    profileMarkup && profileMarkup.quotation && !isCustomMarkup
                        ? profileMarkup.quotation.visaMarkupType === "percentage"
                            ? ((selectedVisaType.childPrice + visa.childMarketMarkup) / 100) *
                              profileMarkup.quotation.visaMarkup
                            : profileMarkup.quotation.visaMarkup
                        : 0;

                visa.adultCost = selectedVisaType.adultPrice;
                visa.childCost = selectedVisaType.childPrice;
                visa.adultPrice =
                    selectedVisaType.adultPrice + visa.adultProfileMarkup + visa.adultMarketMarkup;

                visa.childPrice =
                    selectedVisaType.childPrice + visa.childProfileMarkup + visa.childMarketMarkup;

                if (otbPrice && Number(otbPrice) < 1) {
                    return sendErrorResponse(
                        res,
                        400,
                        "OTB Price should be grater than or equal to 1"
                    );
                }
            }

            let adultTotalPrice =
                (visa ? visa?.adultPrice + (otbPrice ? Number(otbPrice) : 0) : 0) +
                excursionAdultTotal;
            let childrenTotalPrice =
                (visa ? visa?.childPrice + (otbPrice ? Number(otbPrice) : 0) : 0) +
                excursionChildTotal;
            let totalAdultMarketMarkup =
                adultMarketMarkupTotal +
                (visa ? visa?.adultMarketMarkup : 0) +
                pvtTransferMarketMarkupTotal;

            let totalChildMarketMarkup =
                childMarketMarkupTotal +
                (visa ? visa?.childMarketMarkup : 0) +
                pvtTransferMarketMarkupTotal;
            let totalAdultProfileMarkup =
                adultProfileMarkupTotal +
                (visa ? visa?.adultProfileMarkup : 0) +
                pvtTransferProfileMarkupTotal;
            let totalChildProfileMarkup =
                childProfileMarkupTotal +
                (visa ? visa?.childProfileMarkup : 0) +
                pvtTransferProfileMarkupTotal;

            let transferQuotation;
            if (isTransferQuotationDisabled === false) {
                if (transfer?.length < 1) {
                    return sendErrorResponse(
                        res,
                        400,
                        `please select a transfer type in  transfer`
                    );
                }

                let transferMarkup;
                let stayTransfers = [];
                for (let i = 0; i < transfer?.length; i++) {
                    let stay = transfer[i];

                    let transfers = [];
                    let ppTotalPricePerStayTransfer = 0;
                    let ppTotalMarketMarkupPerStayTransfer = 0;
                    for (let j = 0; j < stay?.stays?.length; j++) {
                        let transferDt = stay?.stays[j];

                        if (!transferDt?.vehicleTypes || transferDt?.vehicleTypes?.length < 1) {
                            continue;
                        }

                        let transferFromDetails;
                        let transferToDetails;
                        if (transferDt.transferType === "city-city") {
                            transferFromDetails = await Area.findOne({
                                _id: transferDt.transferFrom,
                                isDeleted: false,
                            });
                            transferToDetails = await Area.findOne({
                                _id: transferDt.transferTo,
                                isDeleted: false,
                            });
                        } else if (transferDt.transferType === "airport-city") {
                            transferFromDetails = await Airport.findOne({
                                _id: transferDt.transferFrom,
                                isDeleted: false,
                            });
                            transferToDetails = await Area.findOne({
                                _id: transferDt.transferTo,
                                isDeleted: false,
                            });
                        } else if (transferDt.transferType === "city-airport") {
                            transferFromDetails = await Area.findOne({
                                _id: transferDt.transferFrom,
                                isDeleted: false,
                            });
                            transferToDetails = await Airport.findOne({
                                _id: transferDt.transferTo,
                                isDeleted: false,
                            });
                        }

                        if (!transferFromDetails && !transferToDetails) {
                            return sendErrorResponse(res, 400, `hub is not found for transfer`);
                        }

                        let transferFromId;
                        let transferToId;

                        if (transferDt.transferType === "city-city") {
                            let transferFromGroup = await GroupArea.findOne({
                                isDeleted: false,

                                areas: { $in: [transferDt.transferFrom] },
                            });
                            let transferToGroup = await GroupArea.findOne({
                                isDeleted: false,

                                areas: { $in: [transferDt.transferTo] },
                            });
                            transferFromId = transferFromGroup._id;
                            transferToId = transferToGroup._id;
                        } else if (transferDt.transferType === "city-airport") {
                            let transferFromGroup = await GroupArea.findOne({
                                isDeleted: false,

                                areas: { $in: [transferDt.transferFrom] },
                            });
                            transferFromId = transferFromGroup._id;
                            transferToId = transferDt.transferTo;
                        } else if (transferDt.transferType === "airport-city") {
                            let transferToGroup = await GroupArea.findOne({
                                isDeleted: false,

                                areas: { $in: [transferDt.transferTo] },
                            });
                            transferFromId = transferDt.transferFrom;
                            transferToId = transferToGroup._id;
                        }

                        let transferDetails = await Transfer.findOne({
                            isDeleted: false,

                            // transferType: transferDt?.transferType,
                            transferFrom: transferFromId,
                            transferTo: transferToId,
                        });

                        if (!transferDetails) {
                            return sendErrorResponse(
                                res,
                                400,
                                "transfer from not found for this hubs."
                            );
                        }

                        const selectedMarketPrice = market?.transfer?.find((tf) => {
                            return tf?.transferId?.toString() === transferDetails?._id?.toString();
                        });

                        const promises = [];
                        let totalCost = 0;
                        let totalPrice = 0;
                        let totalMarketMarkup = 0;
                        let profileMarkup = 0;
                        let totalCapacity;
                        let vehicleTypes = [];
                        for (let i = 0; i < transferDt?.vehicleTypes?.length; i++) {
                            if (Number(transferDt?.vehicleTypes[i]?.count) < 1) {
                                continue;
                            }

                            let vehicleType = transferDetails?.vehicleType.find(
                                (vehType) =>
                                    vehType?.vehicle?.toString() ===
                                    transferDt?.vehicleTypes[i]?.vehicle?.toString()
                            );

                            if (!vehicleType) {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "There is no vehicle type found for this particular airport transfer."
                                );
                            }

                            let singleVehicleType = await VehicleType.findById(vehicleType.vehicle);

                            if (!singleVehicleType) {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "There is no vehicle type found for this particular airport transfer."
                                );
                            }

                            const selectedVehiclePrice = selectedMarketPrice?.vehicleType?.find(
                                (vehType) => {
                                    return (
                                        vehType?.vehicleId.toString() ===
                                        vehicleType?.vehicle.toString()
                                    );
                                }
                            );

                            const marketMarkupPerVehicle =
                                market && selectedVehiclePrice
                                    ? selectedVehiclePrice.markupType === "percentage"
                                        ? (vehicleType?.price / 100) * selectedVehiclePrice.markup
                                        : selectedVehiclePrice.markup
                                    : 0;

                            totalCost += Number(vehicleType?.price);

                            totalPrice +=
                                Number(marketMarkupPerVehicle) + Number(vehicleType?.price);
                            totalMarketMarkup += marketMarkupPerVehicle;

                            totalCapacity = singleVehicleType
                                ? singleVehicleType?.airportOccupancy *
                                  Number(transferDt?.vehicleTypes[i]?.count)
                                : 0;

                            vehicleTypes.push({
                                vehicle: singleVehicleType?._id,
                                name: singleVehicleType?.name,
                                count: transferDt?.vehicleTypes[i]?.count,
                                occupancy: singleVehicleType?.airportOccupancy,
                            });

                            promises.push(vehicleTypes);
                        }

                        const promiseResponse = await Promise.all([...promises]);

                        let ppTotalPricePerTransfer = Number(totalPrice) / Number(totalPax);
                        let ppMarketMarkup = Number(totalMarketMarkup) / Number(totalPax);

                        transfers.push({
                            transferId: transferDetails._id,
                            transferType: transferDt?.transferType,
                            transferFromName:
                                transferDt.transferType === "airport-city"
                                    ? transferFromDetails?.airportName
                                    : transferFromDetails?.areaName,
                            transferFrom: transferDt?.transferFrom,
                            transferTo: transferDt?.transferTo,
                            transferToName:
                                transferDt.transferType === "city-airport"
                                    ? transferToDetails.airportName
                                    : transferToDetails.areaName,
                            transferToHubName: transferDt.transferToName,
                            transferFromHubName: transferDt.transferFromName,
                            transferToId: transferDt.transferToId,
                            transferFromId: transferDt.transferFromId,
                            transferToName: transferDt?.transferFromName,
                            vehicleTypes,
                            ppTotalPricePerTransfer: Number(ppTotalPricePerTransfer),
                            ppMarketMarkup: Number(ppMarketMarkup),
                            transferCapacity: Number(totalCapacity),
                        });

                        ppTotalPricePerStayTransfer += Number(ppTotalPricePerTransfer);
                        ppTotalMarketMarkupPerStayTransfer += Number(ppMarketMarkup);
                    }

                    let transferProfileMarkup =
                        profileMarkup && profileMarkup.quotation && !isCustomMarkup
                            ? profileMarkup.quotation.landTransferMarkupType === "percentage"
                                ? (ppTotalPricePerStayTransfer / 100) *
                                  profileMarkup?.quotation?.landTransferMarkup
                                : profileMarkup?.quotation?.landTransferMarkup
                            : 0;

                    stayTransfers.push({
                        transfers,
                        ppTotalPricePerStayTransfer: Number(
                            ppTotalPricePerStayTransfer + transferProfileMarkup
                        ),
                        ppTotalMarketMarkupPerStayTransfer: Number(
                            ppTotalMarketMarkupPerStayTransfer
                        ),
                        ppTotalProfileMarkupPerStayTransfer: Number(transferProfileMarkup),
                        stayNo: Number(stay.stayNo),
                    });
                }

                transferQuotation = new TransferQuotation({
                    stayTransfers: stayTransfers,
                });

                await transferQuotation.save();
            }

            let hotelQuotation;
            if (isHotelQuotationDisabled === false) {
                if (isAlreadyBooked) {
                    if (stays?.length < 1) {
                        return sendErrorResponse(
                            res,
                            400,
                            "Please fill required fileds on hotel quotation or disable it"
                        );
                    }

                    let filteredQuation = stays.map((stay) => {
                        let filteredHotels = stay?.hotels?.filter((hotel) => {
                            if (hotel?.hotelId) {
                                return hotel;
                            }
                            return "";
                        });

                        return {
                            hotels: filteredHotels,
                        };
                    });

                    for (let j = 0; j < filteredQuation?.length; j++) {
                        let hotels = filteredQuation[j].hotels;

                        if (filteredQuation[j].hotels?.length < 1) {
                            return sendErrorResponse(
                                res,
                                400,
                                "Please fill required fileds on hotel quotation or disable it"
                            );
                        }

                        for (let i = 0; i < hotels?.length; i++) {
                            let hotelData = await Hotel.findOne({
                                _id: hotels[i].hotelId,
                            }).populate("country state city");

                            if (!hotelData) {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "selected hotel is not found in this list "
                                );
                            }

                            hotels[i].hotelName = hotelData?.hotelName;
                            hotels[i].starCategory = hotelData?.starCategory;
                            hotels[i].country = hotelData?.country?.countryName;
                            hotels[i].state = hotelData?.state?.stateName;
                            hotels[i].city = hotelData?.city?.cityName;
                            hotels[i].cityId = hotelData?.city?._id;
                            hotels[i].areaId = hotelData?.area?._id;

                            hotels[i].area = hotelData?.area?.areaName;
                        }
                    }

                    hotelQuotation = new HotelQuotation({
                        stays: filteredQuation,
                        isAlreadyBooked,
                    });

                    await hotelQuotation.save();

                    adultTotalPrice +=
                        Number(transferQuotation?.stayTransfers[0]?.ppTotalPricePerStayTransfer) ||
                        0;

                    childrenTotalPrice +=
                        Number(transferQuotation?.stayTransfers[0]?.ppTotalPricePerStayTransfer) ||
                        0;

                    totalChildMarketMarkup +=
                        Number(
                            transferQuotation?.stayTransfers[0]?.ppTotalMarketMarkupPerStayTransfer
                        ) || 0;
                    totalAdultMarketMarkup +=
                        Number(
                            transferQuotation?.stayTransfers[0]?.ppTotalMarketMarkupPerStayTransfer
                        ) || 0;

                    totalAdultProfileMarkup +=
                        Number(
                            transferQuotation?.stayTransfers[0]?.ppTotalProfileMarkupPerStayTransfer
                        ) || 0;
                    totalChildProfileMarkup +=
                        Number(
                            transferQuotation?.stayTransfers[0]?.ppTotalProfileMarkupPerStayTransfer
                        ) || 0;
                } else {
                    if (stays?.length < 1) {
                        return sendErrorResponse(
                            res,
                            400,
                            "Please fill required fileds on hotel quotation or disable it"
                        );
                    }

                    let filteredQuation = stays.map((stay) => {
                        let filteredHotels = stay?.hotels?.filter((hotel) => {
                            if (hotel?.hotelId) {
                                return hotel;
                            }
                            return "";
                        });

                        return {
                            hotels: filteredHotels,
                        };
                    });

                    if (filteredQuation?.length < 1) {
                        return sendErrorResponse(
                            res,
                            400,
                            "Please fill required fileds on hotel quotation or disable it"
                        );
                    }

                    let idx = 1;
                    for (let j = 0; j < filteredQuation?.length; j++) {
                        let totalNumDays = 0;
                        let hotelTransferPrice = 0;
                        let occupancyArray = [];

                        if (filteredQuation[j].hotels?.length < 1) {
                            return sendErrorResponse(
                                res,
                                400,
                                "Please fill required fileds on hotel quotation or disable it"
                            );
                        }

                        let hotels = filteredQuation[j].hotels;

                        for (let i = 0; i < hotels?.length; i++) {
                            const dateFrom = new Date(hotels[i].checkInDate);
                            const dateTo = new Date(hotels[i].checkOutDate);
                            const timeDiff = Math.abs(dateTo.getTime() - dateFrom.getTime());

                            const numDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

                            hotels[i].checkInDate = new Date(hotels[i].checkInDate)
                                .toISOString()
                                .substring(0, 10);

                            hotels[i].checkOutDate = new Date(hotels[i].checkOutDate)
                                .toISOString()
                                .substring(0, 10);

                            if (
                                hotels[i].checkInDate > checkOutDate ||
                                hotels[i].checkOutDate > checkOutDate
                            ) {
                                return sendErrorResponse(
                                    res,
                                    404,
                                    `Date selected found to be above checkout date for stay ${
                                        j + 1
                                    } and hotel ${i + 1}, Please check and try again`
                                );
                            }

                            if (
                                hotels[i].checkInDate < checkInDate ||
                                hotels[i].checkOutDate < checkInDate
                            ) {
                                return sendErrorResponse(
                                    res,
                                    404,
                                    `Date selected found to be below checkin date for stay ${
                                        j + 1
                                    } and hotel ${i + 1}, Please check and try again`
                                );
                            }

                            if (numDays < 1) {
                                return sendErrorResponse(
                                    res,
                                    404,
                                    "Date selected found to be wrong , Please check and try again"
                                );
                            }
                            isExcursionQuotationDisabled;

                            const hotelData = await singleRoomTypeRate(
                                noOfAdults,
                                noOfChildren,
                                childrenAges,
                                hotels[i].checkInDate,
                                hotels[i].checkOutDate,
                                hotels[i].hotelId,
                                hotels[i].roomTypeId,
                                hotels[i].boardTypeCode
                            );

                            for (let k = 0; k < hotelData.rates.length; k++) {
                                hotelData.rates[k].cost = hotelData.rates[k].price;

                                if (hotelData.rates[k].price) {
                                    const selectHotel = market?.hotel?.find((ht) => {
                                        return (
                                            ht?.hotelId?.toString() ===
                                            hotels[i]?.hotelId?.toString()
                                        );
                                    });

                                    const selectedRoomType = selectHotel?.roomTypes.find(
                                        (roomType) => {
                                            if (hotels[i]?.isCustomHotelMarkup) {
                                                return (
                                                    roomType.roomTypeId?.toString() ===
                                                    hotels[i].roomTypeId.toString()
                                                );
                                            }
                                        }
                                    );

                                    const selectedStarCategory = market?.starCategory?.find(
                                        (sc) => {
                                            return (
                                                sc?.name?.toString() ===
                                                hotelData?.hotel?.starCategory?.toString()
                                            );
                                        }
                                    );

                                    hotelData.rates[k].marketMarkup =
                                        market && selectedRoomType
                                            ? selectedRoomType.markupType === "percentage"
                                                ? (hotelData.rates[k].price / 100) *
                                                  selectedRoomType.markup *
                                                  numDays
                                                : selectedRoomType.markup * numDays
                                            : market && selectedStarCategory
                                            ? selectedStarCategory.markupType === "percentage"
                                                ? (hotelData.rates[k].price / 100) *
                                                  selectedStarCategory.markup *
                                                  numDays
                                                : selectedStarCategory.markup * numDays
                                            : 0;

                                    hotelData.rates[k].profileMarkup =
                                        profileMarkup && profileMarkup.quotation && !isCustomMarkup
                                            ? profileMarkup.quotation.hotelMarkupType ===
                                              "percentage"
                                                ? (hotelData.rates[k].marketMarkup +
                                                      hotelData.rates[k].price / 100) *
                                                  profileMarkup?.quotation?.hotelMarkup *
                                                  numDays
                                                : profileMarkup?.quotation?.hotelMarkup * numDays
                                            : 0;

                                    hotelData.rates[k].price =
                                        hotelData.rates[k].profileMarkup +
                                        hotelData.rates[k].marketMarkup +
                                        hotelData.rates[k].cost;
                                }

                                let existing = occupancyArray.find(
                                    (occupancy) =>
                                        occupancy.occupancyShortName ===
                                        hotelData.rates[k].occupancyShortName
                                );

                                if (existing) {
                                    if (
                                        (hotelData.rates[k].price > 0 ||
                                            hotelData.rates[k].price === 0) &&
                                        (existing.price > 0 || existing.price === 0)
                                    ) {
                                        existing.price += Number(hotelData?.rates[k]?.price);
                                        existing.profileMarkup += Number(
                                            hotelData?.rates[k]?.profileMarkup
                                        );
                                        existing.marketMarkup += Number(
                                            hotelData?.rates[k]?.marketMarkup
                                        );
                                    } else {
                                        existing.price = null;
                                        existing.profileMarkup = null;
                                        existing.marketMarkup = null;
                                    }
                                } else {
                                    if (
                                        hotelData.rates[k].price > 0 ||
                                        hotelData.rates[k].price === 0
                                    ) {
                                        occupancyArray.push({
                                            occupancyShortName:
                                                hotelData?.rates[k]?.occupancyShortName,
                                            price: Number(hotelData?.rates[k]?.price),
                                            marketMarkup: Number(hotelData.rates[k].marketMarkup),
                                            profileMarkup: Number(hotelData.rates[k].profileMarkup),
                                        });
                                    } else {
                                        occupancyArray.push({
                                            occupancyShortName:
                                                hotelData.rates[k].occupancyShortName,
                                            price: null,
                                            profileMarkup: null,
                                            marketMarkup: null,
                                        });
                                    }
                                }
                            }

                            hotels[i].hotelName = hotelData?.hotel?.hotelName;
                            hotels[i].starCategory = hotelData?.hotel?.starCategory;
                            hotels[i].country = hotelData?.hotel?.country?.countryName;
                            hotels[i].state = hotelData?.hotel?.state?.stateName;
                            hotels[i].city = hotelData?.hotel?.city?.cityName;
                            hotels[i].cityId = hotelData?.hotel?.city?._id;
                            hotels[i].areaId = hotelData?.hotel?.area?._id;
                            hotels[i].area = hotelData?.hotel?.area?.areaName;
                            hotels[i].roomType = hotelData?.roomType?.roomName;
                            hotels[i].roomOccupancies = hotelData?.rates;
                            hotels[i].boardTypeCode = hotels[i].boardTypeCode;

                            totalNumDays += numDays;
                        }

                        let occupancyArr = occupancyArray.map((occpArray, index) => {
                            let totalPerPrice = occpArray.price;
                            let totalMarketMarkup = occpArray.marketMarkup || 0;
                            let totalProfileMarkup = occpArray.profileMarkup || 0;

                            let transferStay;
                            if (transferQuotation) {
                                transferStay = transferQuotation?.stayTransfers.find(
                                    (st) => st.stayNo === idx
                                );
                            }

                            if (
                                occpArray?.occupancyShortName?.toUpperCase() === "CNB" ||
                                occpArray?.occupancyShortName?.toUpperCase() === "CWB"
                            ) {
                                if (totalPerPrice != null && totalPerPrice >= 0) {
                                    totalPerPrice += Number(childrenTotalPrice);
                                    totalMarketMarkup += Number(totalChildMarketMarkup);
                                    totalProfileMarkup += Number(totalChildProfileMarkup);
                                }
                            } else {
                                if (totalPerPrice != null && totalPerPrice >= 0) {
                                    totalPerPrice += Number(adultTotalPrice);
                                    totalMarketMarkup += Number(totalAdultMarketMarkup);
                                    totalProfileMarkup += Number(totalAdultProfileMarkup);
                                }
                            }

                            let perPersonPriceWithTransfer;

                            let perPersonTotalPrice;
                            let perPersonMarketMarkup;
                            let perPersonProfileMarkup;

                            if (transferStay) {
                                perPersonTotalPrice =
                                    totalPerPrice >= 0 && totalPerPrice != null
                                        ? totalPerPrice /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;

                                perPersonMarketMarkup =
                                    totalMarketMarkup >= 0 && totalMarketMarkup != null
                                        ? Number(
                                              totalMarketMarkup +
                                                  transferStay?.ppTotalMarketMarkupPerStayTransfer
                                          ) /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;
                                perPersonProfileMarkup =
                                    totalProfileMarkup >= 0 && totalProfileMarkup != null
                                        ? Number(
                                              totalProfileMarkup +
                                                  transferStay?.ppTotalProfileMarkupPerStayTransfer
                                          ) /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;

                                perPersonPriceWithTransfer =
                                    totalPerPrice >= 0 && totalPerPrice != null
                                        ? Number(
                                              totalPerPrice +
                                                  transferStay?.ppTotalPricePerStayTransfer
                                          ) /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;

                                perPersonPriceWithTransfer =
                                    perPersonPriceWithTransfer >= 0 &&
                                    perPersonPriceWithTransfer != null
                                        ? perPersonPriceWithTransfer
                                        : null;
                            } else {
                                perPersonTotalPrice =
                                    totalPerPrice >= 0 && totalPerPrice != null
                                        ? totalPerPrice /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;
                                perPersonMarketMarkup =
                                    totalMarketMarkup >= 0 && totalMarketMarkup != null
                                        ? Number(totalMarketMarkup) /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;
                                perPersonProfileMarkup =
                                    totalProfileMarkup >= 0 && totalProfileMarkup != null
                                        ? Number(totalProfileMarkup) /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;
                                perPersonPriceWithTransfer =
                                    totalPerPrice >= 0 && totalPerPrice != null
                                        ? Number(totalPerPrice) /
                                          (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1)
                                        : null;

                                perPersonPriceWithTransfer =
                                    perPersonPriceWithTransfer >= 0 &&
                                    perPersonPriceWithTransfer != null
                                        ? perPersonPriceWithTransfer
                                        : null;
                            }

                            return {
                                ...occpArray,
                                price: perPersonTotalPrice != null ? perPersonTotalPrice : null,
                                priceWithTransfer:
                                    perPersonTotalPrice != null ? perPersonPriceWithTransfer : null,
                                perPersonProfileMarkup:
                                    perPersonTotalPrice != null ? perPersonProfileMarkup : null,
                                perPersonMarketMarkup:
                                    perPersonMarketMarkup != null ? perPersonMarketMarkup : null,
                            };
                        });

                        if (totalNumDays > noOfNights) {
                            return sendErrorResponse(
                                res,
                                400,
                                "Please fill dates fileds correctly"
                            );
                        }

                        filteredQuation[j].roomOccupancyList = occupancyArr;
                        idx++;
                    }

                    hotelQuotation = new HotelQuotation({
                        stays: filteredQuation,
                    });

                    await hotelQuotation.save();
                }
            }

            const totalAmendments = await QuotationAmendment.find({
                quotationNumber,
            }).count();

            const convertedAdultPrice =
                adultTotalPrice / (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1);
            const perPersonAdultPrice =
                convertedAdultPrice +
                (isCustomMarkup
                    ? customMarkupType?.toLowerCase() === "flat"
                        ? Number(customMarkup)
                        : (convertedAdultPrice / 100) * Number(customMarkup)
                    : 0);
            const convertedAdultMarketMarkup =
                totalAdultMarketMarkup / (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1);
            const perPersonAdultMarketMarkup = convertedAdultMarketMarkup;
            // (isCustomMarkup
            //     ? customMarkupType?.toLowerCase() === "flat"
            //         ? Number(customMarkup)
            //         : (convertedAdultMarketMarkup / 100) * Number(customMarkup)
            //     : 0);

            const convertedAdultProfileMarkup =
                totalAdultProfileMarkup / (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1);
            const perPersonAdultProfileMarkup = convertedAdultProfileMarkup;
            // (isCustomMarkup
            //     ? customMarkupType?.toLowerCase() === "flat"
            //         ? Number(customMarkup)
            //         : (convertedAdultProfileMarkup / 100) * Number(customMarkup)
            //     : 0);

            const convertedChildPrice =
                childrenTotalPrice / (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1);
            const perPersonChildPrice =
                convertedChildPrice +
                (isCustomMarkup
                    ? customMarkupType?.toLowerCase() === "flat"
                        ? Number(customMarkup)
                        : (convertedChildPrice / 100) * Number(customMarkup)
                    : 0);

            const convertedChildMarketMarkup =
                totalChildMarketMarkup / (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1);
            const perPersonChildMarketMarkup = convertedChildMarketMarkup;
            // (isCustomMarkup
            //     ? customMarkupType?.toLowerCase() === "flat"
            //         ? Number(customMarkup)
            //         : (convertedChildMarketMarkup / 100) * Number(customMarkup)
            //     : 0);

            const convertedChildProfileMarkup =
                totalChildProfileMarkup / (quotationCurrency?.toUpperCase() === "USD" ? 3.65 : 1);
            const perPersonChildProfileMarkup = convertedChildProfileMarkup;
            // (isCustomMarkup
            //     ? customMarkupType?.toLowerCase() === "flat"
            //         ? Number(customMarkup)
            //         : (convertedChildProfileMarkup / 100) * Number(customMarkup)
            //     : 0);

            const newQuotationAmendment = new QuotationAmendment({
                reseller: req.reseller._id,
                createdBy: "reseller",
                noOfAdults,
                noOfChildren,
                childrenAges,
                checkInDate: formattedCheckInDate,
                checkOutDate: formattedCheckOutDate,
                noOfNights,
                paxType,
                arrivalAirport,
                departureAirport,
                isArrivalAirportDisabled,
                isDepartureAirportDisabled,
                arrivalIataCode: arrivalAirportDetails?.iataCode,
                departureIataCode: departureAirportDetails?.iataCode,
                arrivalAirportName: arrivalAirportDetails?.airportName,
                departureAirportName: departureAirportDetails?.airportName,
                hotelQuotation: hotelQuotation?._id,
                transferQuotation: transferQuotation?._id,
                excursionQuotation: excursionQuotation?._id,
                excSupplementQuotation: excSupplementQuotation?._id,
                quotationNumber,
                quotationCurrency,
                isVisaNeeded: visa ? true : false,
                visa: visa
                    ? {
                          visaId,
                          name: visa?.visaName,
                          country: visa?.visa,
                          nationality: selectedVisaNationality,
                          adultPrice: visa.adultPrice,
                          childPrice: visa.childPrice,
                          adultCost: visa.adultCost,
                          childCost: visa.childCost,
                          adultMarketMarkup: visa.adultMarketMarkup,
                          adultProfileMarkup: visa.adultProfileMarkup,
                          childMarketMarkup: visa.childMarketMarkup,
                          childProfileMarkup: visa.childProfileMarkup,
                          otbPrice: otbPrice ? Number(otbPrice) : 0,
                      }
                    : undefined,
                isTransferQuotationDisabled,
                isHotelQuotationDisabled,
                isSupplimentQuotationDisabled,
                isExcursionQuotationDisabled,
                isVisaQuotationDisabled,
                hotelDisabledRemark: isHotelQuotationDisabled ? hotelDisabledRemark : undefined,
                perPersonAdultPrice,
                perPersonChildPrice,
                perPersonAdultMarketMarkup,
                perPersonAdultProfileMarkup,
                perPersonChildMarketMarkup,
                perPersonChildProfileMarkup,
                clientName,
                isResellerDisabled: false,
                isAlreadyBooked,
                departureTerminalId,
                departureTerminalCode,
                arrivalTerminalId,
                arrivalTerminalCode,
                status: "not-confirmed",
                pickupPlaceId,
                pickupNote,
            });
            await newQuotationAmendment.save();

            await quotation.updateOne({
                amendment: newQuotationAmendment._id,
                totalAmendments: totalAmendments + 1,
            });
            const quotationSheet = await createQtnSheet({
                quotationNumber,
                // agentQuotationNumber,
                totalPax,
                noOfAdults,
                noOfChildren,
                transferQuotation,
                hotelQuotation,
                excursionQuotation,
                visa,
                quotationCurrency,
                amendmentNo: totalAmendments + 1,
                perPersonAdultPrice,
                perPersonChildPrice,
                perPersonAdultMarketMarkup,
                perPersonAdultProfileMarkup,
                perPersonChildMarketMarkup,
                perPersonChildProfileMarkup,
                noOfNights,
                checkInDate,
                checkOutDate,
                otbPrice,
                isTransferQuotationDisabled,
                isHotelQuotationDisabled,
                isSupplimentQuotationDisabled,
                isExcursionQuotationDisabled,
            });

            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            let pdfPath = "/public/pdf/quotation" + uniqueSuffix + ".pdf";
            await createPdf({
                path: pdfPath,
                reseller: req.reseller,
                amendment: newQuotationAmendment,
                excursionQuotation,
                hotelQuotation,
                quotation,
                transferQuotation,
                excSupplementQuotation,
            });

            const adminAccess = await AdminB2bAccess.findOne({
                reseller: req.reseller._id,
            }).populate("quotations");

            if (adminAccess) {
                for (let i = 0; i < adminAccess?.quotations?.length; i++) {
                    await sentQuotationEmail({
                        path: pdfPath,
                        reseller: adminAccess.quotations[i],
                        amendment: newQuotationAmendment,
                        excursionQuotation,
                        hotelQuotation,
                        quotation: quotation,
                        transferQuotation,
                        excSupplementQuotation,
                    });
                }
            }

            await sentQuotationEmail({
                path: pdfPath,
                reseller: req.reseller,
                amendment: newQuotationAmendment,
                excursionQuotation,
                hotelQuotation,
                quotation: quotation,
                transferQuotation,
                excSupplementQuotation,
            });

            newQuotationAmendment.sheet = quotationSheet;
            newQuotationAmendment.pdf = pdfPath;
            await newQuotationAmendment.save();

            res.status(200).json({
                message: "Quotation Updated successfully",
                quotationNumber,
                amendementId: newQuotationAmendment._id,
            });
        } catch (err) {
            console.log(err, "message");
            sendErrorResponse(res, 500, err);
        }
    },

    getQuotationDetails: async (req, res) => {
        try {
            const { quotationNumber } = req.params;

            const quotation = await Quotation.findOne({
                quotationNumber,
                reseller: req.reseller._id,
            })
                .populate({
                    path: "amendment",
                    populate: {
                        path: "hotelQuotation excursionQuotation transferQuotation excSupplementQuotation",
                    },
                })
                .populate("reseller")
                .lean();

            if (!quotation) {
                return sendErrorResponse(res, 400, "Quotation Not found");
            }

            res.status(200).json(quotation);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getQuotationsList: async (req, res) => {
        try {
            const { quotationNumber, skip = 0, limit = 10, dateFrom, dateTo, status } = req.query;

            const filters = {
                reseller: req.reseller?._id,
            };

            if (quotationNumber && quotationNumber !== "") {
                filters.quotationNumber = Number(quotationNumber);
            }

            if (status && status !== "") {
                filters.status = status;
            }

            if (dateFrom && dateFrom !== "") {
                filters.updatedAt = { $gte: new Date(dateFrom) };
            }

            if (dateTo && dateTo !== "") {
                filters.updatedAt = {
                    ...filters.updatedAt,
                    $lte: new Date(new Date(dateTo).setDate(new Date(dateTo).getDate() + 1)),
                };
            }

            const quotations = await Quotation.find(filters)
                .limit(limit)
                .skip(limit * skip)
                .sort({ updatedAt: -1 })
                .lean();

            const totalQuotations = await Quotation.find(filters).count();

            res.status(200).json({ quotations, totalQuotations });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleQuotationsAmendments: async (req, res) => {
        try {
            const { quotationNumber } = req.params;

            const quotation = await Quotation.findOne({
                quotationNumber,
                reseller: req.reseller?._id,
            })
                .populate({
                    path: "amendments",
                    options: {
                        sort: { createdAt: -1 },
                    },
                    populate: {
                        path: "hotelQuotation excursionQuotation transferQuotation excSupplementQuotation visa.visaId",
                    },
                })
                .populate({
                    path: "reseller",
                    select: "name email phoneNumber website",
                })
                .lean();

            res.status(200).json(quotation);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleAmendment: async (req, res) => {
        try {
            const { id } = req.params;

            let amendment = await QuotationAmendment.findById(id)
                .populate(
                    "hotelQuotation excursionQuotation transferQuotation excSupplementQuotation visa.visaId"
                )
                .populate({
                    path: "hotelQuotation",
                    populate: {
                        path: "stays",
                        populate: {
                            path: "hotels",
                            populate: {
                                path: "hotelId",
                                select: "images",
                            },
                        },
                    },
                })
                .lean();

            if (!amendment) {
                return sendErrorResponse(res, 404, "Amendment not found");
            }

            let date = amendment?.checkInDate;

            if (
                amendment?.excursionQuotation?.excursions &&
                amendment?.excursionQuotation?.excursions?.length > 0
            ) {
                let excursions = [];
                for (let i = 0; i < amendment?.excursionQuotation?.excursions?.length; i++) {
                    let selectedExc = amendment?.excursionQuotation?.excursions[i];

                    const exc = await Excursion.aggregate([
                        {
                            $match: {
                                isQuotation: true,
                                activityId: Types.ObjectId(selectedExc.excursionId),
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
                                                        {
                                                            $lt: [
                                                                "$$ticketPrice.fromDate",
                                                                new Date(date),
                                                            ],
                                                        },
                                                        {
                                                            $gt: [
                                                                "$$ticketPrice.toDate",
                                                                new Date(date),
                                                            ],
                                                        },
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
                                                            $gt: [
                                                                "$$sicWithTicket.toDate",
                                                                new Date(date),
                                                            ],
                                                        },
                                                        {
                                                            $ne: [
                                                                "$$sicWithTicket.adultPrice",
                                                                null,
                                                            ],
                                                        },
                                                        {
                                                            $ne: [
                                                                "$$sicWithTicket.childPrice",
                                                                null,
                                                            ],
                                                        }, // Less than toDate
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
                                                            $lt: [
                                                                "$$sicPrice.fromDate",
                                                                new Date(date),
                                                            ],
                                                        },
                                                        {
                                                            $gt: [
                                                                "$$sicPrice.toDate",
                                                                new Date(date),
                                                            ],
                                                        }, // Less than toDate
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

                    let excursion = exc[0];

                    excursions.push({
                        _id: excursion?._id,
                        name: excursion?.name,
                        attraction: excursion?.attraction,
                        excursionType: excursion?.excursionType,
                        ticketOnlyPricing: excursion?.ticketOnlyPricing,
                        ticketSharedPricing: excursion?.ticketSharedPricing,
                        transferSharedPricing: excursion?.transferSharedPricing,
                        ticketVehicleType: excursion.ticketVehicleType,
                        transferVehicleType: excursion.transferVehicleType,
                        image: excursion?.image,
                        value:
                            selectedExc?.value.toLowerCase() === "private"
                                ? "Private"
                                : selectedExc?.value.toLowerCase() === "shared"
                                ? "Shared"
                                : "Ticket",
                        vehicleType: selectedExc?.vehicleType,
                    });
                }
                amendment.excursionQuotation.excursions = excursions;
            }

            if (
                amendment?.excSupplementQuotation?.excursions &&
                amendment?.excSupplementQuotation?.excursions?.length > 0
            ) {
                let excursionsSupplement = [];

                for (let i = 0; i < amendment?.excSupplementQuotation?.excursions?.length; i++) {
                    let selectedExc = amendment?.excSupplementQuotation?.excursions[i];

                    const exc = await Excursion.aggregate([
                        {
                            $match: {
                                isQuotation: true,
                                activityId: Types.ObjectId(selectedExc.excursionId),
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
                                                        {
                                                            $lt: [
                                                                "$$ticketPrice.fromDate",
                                                                new Date(date),
                                                            ],
                                                        },
                                                        {
                                                            $gt: [
                                                                "$$ticketPrice.toDate",
                                                                new Date(date),
                                                            ],
                                                        },
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
                                                            $gt: [
                                                                "$$sicWithTicket.toDate",
                                                                new Date(date),
                                                            ],
                                                        }, // Less than toDate
                                                        {
                                                            $ne: [
                                                                "$$sicWithTicket.adultPrice",
                                                                null,
                                                            ],
                                                        },
                                                        {
                                                            $ne: [
                                                                "$$sicWithTicket.childPrice",
                                                                null,
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
                                                            $lt: [
                                                                "$$sicPrice.fromDate",
                                                                new Date(date),
                                                            ],
                                                        },
                                                        {
                                                            $gt: [
                                                                "$$sicPrice.toDate",
                                                                new Date(date),
                                                            ],
                                                        }, // Less than toDate
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
                    let excursion = exc[0];
                    excursionsSupplement.push({
                        _id: excursion?._id,
                        name: excursion?.name,
                        attraction: excursion?.attraction,
                        excursionType: excursion?.excursionType,
                        ticketOnlyPricing: excursion?.ticketOnlyPricing,
                        ticketSharedPricing: excursion?.ticketSharedPricing,
                        transferSharedPricing: excursion?.transferSharedPricing,
                        ticketVehicleType: excursion.ticketVehicleType,
                        transferVehicleType: excursion.transferVehicleType,
                        image: excursion?.image,
                        value:
                            selectedExc?.value.toLowerCase() === "private"
                                ? "Private"
                                : selectedExc?.value.toLowerCase() === "shared"
                                ? "Shared"
                                : "Ticket",
                        vehicleType: selectedExc?.vehicleType,
                    });
                }

                amendment.excSupplementQuotation.excursions = excursionsSupplement;
            }

            let transfer = [];
            for (let i = 0; i < amendment?.hotelQuotation?.stays?.length; i++) {
                let stay = amendment?.hotelQuotation?.stays[i];

                let stays = [];
                for (let j = 0; j < stay?.hotels?.length; j++) {
                    let hotel1 = stay?.hotels[j];
                    stay.hotels[j].hotelData = {
                        hotelId: stay?.hotels[j]?.hotelId._id,
                        image: {
                            isRelative: stay?.hotels[j]?.hotelId.images[0].isRelative,
                            path: stay?.hotels[j]?.hotelId.images[0].path,
                        },
                    };
                    hotel1.hotelId = stay?.hotels[j]?.hotelId._id;

                    if (amendment?.isArrivalAirportDisabled === false && j === 0) {
                        let vehicleTypes = [];

                        let transferTo = await GroupArea.findOne({
                            isDeleted: false,

                            areas: { $in: [hotel1?.areaId] },
                        });

                        // if (!transferTo) {
                        //     return sendErrorResponse(res, 400, "Invalid transfer ");
                        // }

                        let transfer = await Transfer.findOne({
                            isDeleted: false,

                            // transferType: "airport-city",
                            transferTo: transferTo?._id,
                            transferFrom: amendment.arrivalAirport,
                        }).populate("vehicleType.vehicle");

                        let selectedTransfer = amendment?.transferQuotation?.stayTransfers
                            .find((stayTf) => stayTf?.stayNo === i + 1)
                            ?.transfers?.find(
                                (tf) => tf?.transferId.toString() === transfer?._id.toString()
                            );

                        if (selectedTransfer) {
                            for (let k = 0; k < transfer?.vehicleType?.length; k++) {
                                let vehicleType = transfer?.vehicleType[k];
                                let selectedVehicleType = selectedTransfer?.vehicleTypes?.find(
                                    (vehTY) =>
                                        vehTY.vehicle.toString() ===
                                        vehicleType.vehicle._id.toString()
                                );

                                if (selectedVehicleType) {
                                    vehicleTypes.push({
                                        vehicle: selectedVehicleType?.vehicle,
                                        name: selectedVehicleType?.name,
                                        count: selectedVehicleType?.count,
                                        occupancy: selectedVehicleType?.occupancy,
                                    });
                                } else {
                                    vehicleTypes.push({
                                        vehicle: vehicleType?.vehicle?._id,
                                        name: vehicleType?.vehicle?.name,
                                        count: 0,
                                        occupancy: vehicleType?.vehicle?.occupancy,
                                    });
                                }
                            }
                        } else {
                            for (let k = 0; k < transfer?.vehicleType?.length; k++) {
                                let vehicleType = transfer?.vehicleType[k];

                                vehicleTypes.push({
                                    vehicle: vehicleType?.vehicle?._id,
                                    name: vehicleType.vehicle?.name,
                                    count: 0,
                                    occupancy: vehicleType?.vehicle?.occupancy,
                                });
                            }
                        }

                        stays.push({
                            transferType: "airport-city",
                            transferTo: hotel1?.areaId,
                            transferFrom: amendment?.arrivalAirport,
                            transferToName: hotel1?.hotelName,
                            transferFromName: amendment?.arrivalAirportName,
                            transferToId: hotel1?.hotelId,
                            transferFromId: amendment?.arrivalAirport,
                            vehicleTypes,
                            terminalCode: amendment?.arrivalTerminalCode,
                            terminalName: `Terminal ${amendment?.arrivalTerminalCode[1]}`,
                        });
                    }

                    if (j !== stay?.hotels?.length - 1) {
                        let hotel2 = stay?.hotels[j + 1];
                        let vehicleTypes = [];

                        let transferFrom = await GroupArea.findOne({
                            isDeleted: false,

                            areas: { $in: [hotel1?.areaId] },
                        });

                        // if (!transferTo) {
                        //     return sendErrorResponse(res, 400, "Invalid transfer ");
                        // }

                        let transferTo = await GroupArea.findOne({
                            isDeleted: false,
                            areas: { $in: [hotel2?.areaId] },
                        });

                        // if (!transferFrom) {
                        //     return sendErrorResponse(res, 400, "Invalid transfer ");
                        // }

                        let transfer = await Transfer.findOne({
                            isDeleted: false,
                            transferTo: transferTo?._id,
                            transferFrom: transferFrom?._id,
                        }).populate("vehicleType.vehicle");

                        let selectedTransfer = amendment?.transferQuotation?.stayTransfers
                            .find((stayTf) => stayTf?.stayNo === i + 1)
                            ?.transfers.find(
                                (tf) =>
                                    tf?.transferId.toString() === transfer?._id.toString() &&
                                    tf?.transferFromHubName === hotel1?.hotelName &&
                                    tf?.transferToHubName === hotel2?.hotelName
                            );

                        if (selectedTransfer) {
                            for (let k = 0; k < transfer?.vehicleType?.length; k++) {
                                let vehicleType = transfer?.vehicleType[k];
                                let selectedVehicleType = selectedTransfer?.vehicleTypes?.find(
                                    (vehTY) =>
                                        vehTY?.vehicle?.toString() ===
                                        vehicleType?.vehicle?._id.toString()
                                );

                                if (selectedVehicleType) {
                                    vehicleTypes.push({
                                        vehicle: selectedVehicleType?.vehicle,
                                        name: selectedVehicleType?.name,
                                        count: selectedVehicleType?.count,
                                        occupancy: selectedVehicleType?.occupancy,
                                    });
                                } else {
                                    vehicleTypes.push({
                                        vehicle: vehicleType?.vehicle?._id,
                                        name: vehicleType?.vehicle.name,
                                        count: 0,
                                        occupancy: vehicleType?.vehicle?.occupancy,
                                    });
                                }
                            }
                        } else {
                            for (let k = 0; k < transfer?.vehicleType?.length; k++) {
                                let vehicleType = transfer?.vehicleType[k];

                                vehicleTypes.push({
                                    vehicle: vehicleType?.vehicle?._id,
                                    name: vehicleType?.vehicle?.name,
                                    count: 0,
                                    occupancy: vehicleType?.vehicle?.occupancy,
                                });
                            }
                        }

                        stays.push({
                            transferType: "city-city",
                            transferTo: hotel2?.areaId,
                            transferFrom: hotel1?.areaId,
                            transferToName: hotel2?.hotelName,
                            transferFromName: hotel1?.hotelName,
                            transferToId: hotel2?.hotelId,
                            transferFromId: hotel1?.hotelId,
                            vehicleTypes,
                        });
                    }

                    if (
                        amendment.isDepartureAirportDisabled === false &&
                        j === stay?.hotels?.length - 1
                    ) {
                        let vehicleTypes = [];

                        let transferFrom = await GroupArea.findOne({
                            isDeleted: false,

                            areas: { $in: [hotel1?.areaId] },
                        });

                        // if (!transferFrom) {
                        //     return sendErrorResponse(res, 400, "Invalid transfer ");
                        // }

                        let transfer = await Transfer.findOne({
                            // transferType: "city-airport",
                            isDeleted: false,

                            transferTo: amendment?.departureAirport,
                            transferFrom: transferFrom?._id,
                        }).populate("vehicleType.vehicle");

                        let selectedTransfer = amendment?.transferQuotation?.stayTransfers
                            .find((stayTf) => stayTf.stayNo === i + 1)
                            ?.transfers?.find(
                                (tf) => tf?.transferId?.toString() === transfer?._id.toString()
                            );

                        if (selectedTransfer) {
                            for (let k = 0; k < transfer?.vehicleType?.length; k++) {
                                let vehicleType = transfer?.vehicleType[k];
                                let selectedVehicleType = selectedTransfer?.vehicleTypes?.find(
                                    (vehTY) =>
                                        vehTY?.vehicle?.toString() ===
                                        vehicleType?.vehicle._id?.toString()
                                );

                                if (selectedVehicleType) {
                                    vehicleTypes.push({
                                        vehicle: selectedVehicleType?.vehicle,
                                        name: selectedVehicleType?.name,
                                        count: selectedVehicleType?.count,
                                        occupancy: selectedVehicleType?.occupancy,
                                    });
                                } else {
                                    vehicleTypes.push({
                                        vehicle: vehicleType?.vehicle?._id,
                                        name: vehicleType?.vehicle?.name,
                                        count: 0,
                                        occupancy: vehicleType?.vehicle?.occupancy,
                                    });
                                }
                            }
                        } else {
                            for (let k = 0; k < transfer?.vehicleType?.length; k++) {
                                let vehicleType = transfer?.vehicleType[k];

                                vehicleTypes.push({
                                    vehicle: vehicleType?.vehicle?._id,
                                    name: vehicleType?.vehicle?.name,
                                    count: 0,
                                    occupancy: vehicleType?.vehicle?.occupancy,
                                });
                            }
                        }

                        stays.push({
                            transferType: "city-airport",
                            transferFrom: hotel1?.areaId,
                            transferTo: amendment?.departureAirport,
                            transferFromName: hotel1?.hotelName,
                            transferToName: amendment?.departureAirportName,
                            transferToId: amendment?.departureAirport,
                            transferFromId: hotel1?.hotelId,
                            vehicleTypes,
                            terminalCode: amendment?.departureTerminalCode,
                            terminalName: `Terminal ${amendment?.departureTerminalCode[1]}`,
                        });
                    }
                }

                transfer.push({
                    stays,
                    stayNo: i + 1,
                });
            }

            amendment.transferQuotation = transfer;
            amendment.arrivalTerminalName = amendment?.arrivalTerminalCode
                ? `Terminal ${amendment?.arrivalTerminalCode[1]}`
                : "";
            amendment.departureTerminalName = amendment?.departureTerminalCode
                ? `Terminal ${amendment?.departureTerminalCode[1]}`
                : "";

            res.status(200).json({ amendment });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    confirmQuotationAmendment: async (req, res) => {
        try {
            const { amendmentId } = req.params;

            const { comments, selectedStay } = req.body;

            const amendment = await QuotationAmendment.findOne({ _id: amendmentId }).populate(
                "hotelQuotation excursionQuotation transferQuotation excSupplementQuotation reseller guideQuotation"
            );

            if (!amendment) {
                return sendErrorResponse(res, 400, "Amendment not found ");
            }

            const quotation = await Quotation.findOne({
                quotationNumber: amendment.quotationNumber,
            });

            if (!quotation) {
                return sendErrorResponse(res, 400, "quotation not found ");
            }

            if (quotation.status === "confirmed") {
                return sendErrorResponse(res, 400, "Amendment has been already confirmed");
            }

            if (
                amendment?.hotelQuotation?.stays?.length > 0 &&
                !amendment?.hotelQuotation?.isAlreadyBooked
            ) {
                const hotelQt = await HotelQuotation.findById(amendment?.hotelQuotation._id);

                if (selectedStay === undefined || selectedStay === null) {
                    return sendErrorResponse(res, 400, "please select a stay");
                }

                if (!hotelQt?.stays[selectedStay]) {
                    return sendErrorResponse(res, 400, "please select a valid stay");
                }

                hotelQt.stays[selectedStay].selected = true;
                await hotelQt.save();
            }

            quotation.status = "confirmed";
            quotation.confirmedBy = "admin";
            quotation.comments = comments;
            quotation.confirmedAmendment = amendment._id;

            await quotation.save();

            const adminAccess = await AdminB2bAccess.findOne({
                reseller: req.reseller._id,
            }).populate("quotations");

            if (adminAccess) {
                for (let i = 0; i < adminAccess?.quotations?.length; i++) {
                    await sentQuotationEmail({
                        reseller: adminAccess.quotations[i],
                        amendment: amendment,
                        excursionQuotation: amendment.excursionQuotation,
                        hotelQuotation: amendment.hotelQuotation,
                        quotation: quotation,
                        transferQuotation: amendment.transferQuotation,
                        excSupplementQuotation: amendment.excursionQuotation,
                        status: "(Confirmed)",
                        comment: comments,
                    });
                }
            }

            res.status(200).json({
                amendmentId: amendment._id,
                status: "confirmed",
                message: "amendment confirmed successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
