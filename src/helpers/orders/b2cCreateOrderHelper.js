const { Area } = require("../../models/global")
const { GroupArea, 
        Transfer, 
        Airport, 
        Attraction, 
        AttractionActivity, 
        B2CAttractionMarkup,
        AttractionTicket,
        AttractionOrder,
        B2COrder
     } = require('../../models')
const { B2CTransferOrder, B2CTransferOrderPayment } = require("../../models")
const { generateUniqueString, formatDate } = require("../../utils")
const { isValidObjectId, Types } = require('mongoose')
const { getTicketType, saveTicket } = require('../../b2b/helpers/burjKhalifaApiHelper')
const xl = require('excel4node')
const { Hotel } = require("../../models/hotel")

// Day Names
const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];



module.exports = {
    createB2cTransferOrder: async ({
        country,
        name,
        email,
        phoneNumber,
        journeys,
        paymentMethod,
        req,
        res,
        buyer,
        referenceNumber
    }) => {
        try{
            let journeyArray = [];
            let totalNetFare = 0;
            let totalNetCost = 0;
            let totalProfit = 0;

            for(let i = 0; i < journeys.length; i++) {
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
                } = journeys[i]

                let transferFromId;
                let transferToId;
                let transferFrom;
                let transferTo;
                let trips = [];
                let netPrice = 0;
                let netCost = 0;
                let profit = 0;
                
    
                if(pickupSuggestionType === "AREA") {
                    transferFrom = await Area.findOne({_id: pickupLocation})

                    if(!transferFrom) throw new Error ("area not found")

                    let transferFromGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: {$in: [transferFrom?._id]}
                    })

                    if(!transferFromGroup) throw new Error("area not found in this group");

                    transferFrom.name = transferFrom?.areaName;
                    transferFromId = transferFromGroup?._id;

                } else if (pickupSuggestionType === "HOTEL") {
                    let hotel = await Hotel.findOne({_id: pickupLocation})

                    if(!hotel) throw new Error("hotel area not found");

                    transferFrom = await Area.findOne({ _id: hotel?.area }).lean()

                    transferFrom.name = hotel?.hotelName

                    let transferFromGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: {$in: [transferFrom?._id]}
                    })

                    if(!transferFromGroup) throw new Error("area not found in this group")

                    transferFromId = transferFromGroup?._id;
                } else if(pickupSuggestionType === "ATTRACTION") {
                    
                    let attraction = await Attraction.findOne({
                        _id: pickupLocation
                    })

                    if(!attraction) throw new Error("attraction area not found");

                    transferFrom.name = attraction?.title;

                    let transferFromGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: {$in: [transferFrom?._id]}
                    })

                    if(!transferFromGroup) throw new Error("area not found in this group");

                    transferFromId = transferFromGroup?._id
                } else if(pickupSuggestionType === "AIRPORT") {
                    transferFromId = pickupLocation;
                    transferFrom = await Airport.findOne({_id: pickupLocation}).select("airportName place")
                } else {
                    throw new Error("suggestion found in group")
                }

                if(dropOffSuggestionType === "AREA") {
                    transferTo = await Area.findOne({_id: dropOffLocation}).lean()

                    if(!transferTo) throw new Error("area not found")

                    let transferToGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferTo?._id] }
                    });

                    if(!transferToGroup) throw new Error("area not found in this group")

                    transferTo.name = transferTo?.areaName;
                    transferToId = transferToGroup?._id
                } else if(dropOffSuggestionType === "HOTEL") {
                    let hotel = await Hotel.findOne({ _id: dropOffLocation}).select("hotelName area")

                    if(!hotel) throw new Error("hotel not found");

                    transferTo = await Area.findOne({_id: dropOffLocation}).lean()

                    if(!transferTo) throw new Error("hotel area not found")

                    let transferToGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferTo?._id]}
                    })

                    if(!transferToGroup) throw new Error("area not found in this group")

                    transferTo.name = hotel?.hotelName;
                    transferToId = transferToGroup._id
                } else if(dropOffSuggestionType === "ATTRACTION") {
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
                } else if(dropOffSuggestionType === "AIRPORT") {
                    transferToId = dropOffLocation;
                    transferTo = await Airport.findOne({ _id: dropOffLocation }).select(
                        "airportName place"
                    );
                } else {
                    throw new Error("suggestion found in group")
                }

                const transfers = await Transfer.findOne({
                    transferFrom: transferFromId,
                    transferTo: transferToId
                }).populate({
                    path: "vehicleType.vehicle",
                    populate: {
                        path: "vehicleCategoryId"
                    }
                }).lean()

                if(!transfers) throw new Error("transfer not found for this combination")

                let vehicleTypes = []

                let tripPrice = 0;

                for(let k = 0; k < selectedVehicleTypes.length; k++) {
                    let vehicle = transfers?.vehicleType?.find(
                        (vehicleTy)=>
                            vehicleTy?.vehicle?._id?.toString()===
                            selectedVehicleTypes[k]?.vehicle?.toString()
                    )

                    if(!vehicle) throw new Error("vehicle not found for this combination");

                    let totalPrice = vehicle?.price;
                    
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
                    })

                    // not added profit and markups

                    // net cost
                    netCost += Number(vehicle?.price) * Number(selectedVehicleTypes[k]?.count)
                    netPrice += Number(vehicle?.price) * Number(selectedVehicleTypes[k]?.count)
                    tripPrice += Number(vehicle?.price) * Number(selectedVehicleTypes[k]?.count)
                }

                trips.push({
                    transfer: transfers?.transferType,
                    suggestionType: `${pickupSuggestionType}-${dropOffSuggestionType}`,
                    transferFrom,
                    transferTo,
                    pickupDate,
                    pickupTime,
                    vehicleTypes: vehicleTypes,
                    tripPrice
                })

                if(transferType === "return") {
                    let pickupData = new Date(pickupDate + " " + pickupTime);
                    let returnData = new Date(returnDate + " " + returnTime)

                    let localDateString = returnData.toLocaleString();
                    if(returnData < pickupData) {
                        throw new Error("return date should be after pickupDate")
                    }

                    let transferFromId;
                    let transferToId;
                    let transferFrom;
                    let transferTo;

                    if(!dropOffSuggestionType === "AREA") {
                        transferFrom = await Area.findOne({ _id: dropOffLocation }).lean();
                        if(!transferFrom) {
                            throw new Error("area not found")
                        }

                        let transferFromGroup = await GroupArea.findOne({
                            isDeleted: false,
                            areas: { $in: [transferFrom?._id]}
                        })

                        if(!transferFromGroup) throw new Error("area not found in this group")

                        transferFrom.name = transferFrom?.areaName
                        transferFromId = transferFromGroup._id
                    } else if(dropOffSuggestionType === "HOTEL") {
                        let hotel = await Hotel.findOne({_id: dropOffLocation})

                        if(!hotel) throw new Error("hotel not found")

                        transferFrom = await Area.findOne({_id: hotel?.area}).lean();
                        if(!transferFrom) throw new Error("area not found")

                        transferFrom.name = hotel?.hotelName;
                        let transferFromGroup = await GroupArea.findOne({
                            isDeleted: false,
                            areas: {$in:[transferFrom?._id]}
                        })

                        if(!transferFromGroup) throw new Error("area not found in this group")

                        transferFromId = transferFromGroup?._id

                    } else if(dropOffSuggestionType === "ATTRACTION") {
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
                    } else if (dropOffSuggestionType === "AIRPORT"){
                        transferFromId = dropOffLocation;
                        transferFrom = await Airport.findOne({ _id: dropOffLocation }).select(
                            "airportName place"
                        );
                    } else {
                        throw new Error("suggestion found in group")
                    }

                    if(pickupSuggestionType === "AREA") {
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
                    } else if (pickupSuggestionType === "HOTEL"){
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
                    } else if(pickupSuggestionType === "ATTRACTION"){
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
                    } else if(pickupSuggestionType === "AIRPORT"){
                        transferToId = pickupLocation;
                        transferTo = await Airport.findOne({ _id: pickupLocation }).select(
                            "airportName place"
                        );
                    } else {
                        throw new Error("suggestion  found in group"); 
                    }

                    const transfers = await Transfer.findOne({
                        transferFrom: transferFromId,
                        transferTo: transferToId
                    }).populate({
                        path: "vehicleType.vehicle",
                        populate: {
                            path: "vehicleCategoryId"
                        }
                    }).lean()

                    if (!transfers) {
                        throw new Error("transfer not found for this combination ");
                    }

                    let vehicleTypes = []
                    let tripPrice = 0;

                    for(let k = 0; k < selectedVehicleTypes.length; k++) {
                        let vehicle = transfers?.vehicle?.find(
                            (vehicleTy)=>
                            selectedVehicleTypes[k]?.vehicle?.toString()
                        )

                        if (!vehicle) {
                            throw new Error("vehcile not found for this combination ");
                        }

                        let totalPrice = vehicle.price;

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
                        })

                        netCost += Number(vehicle?.price) * Number(selectedVehicleTypes[k]?.count)
                        netPrice += Number(vehicle?.price) * Number(selectedVehicleTypes[k]?.count)
                        tripPrice += Number(vehicle?.price) * Number(selectedVehicleTypes[k]?.count)
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
                    })
                }

                journeyArray.push({
                    noOfAdults: noOfAdults,
                    noOfChildrens: noOfChildrens,
                    totalPassengers: noOfChildrens + noOfAdults,
                    transferType,
                    trips,
                    netPrice: Number(netPrice),
                    netCost: Number(netCost),
                    profit: Number(profit),
                });

                totalNetFare += Number(netPrice);
                totalNetCost += Number(netCost);
                totalProfit += Number(profit)
            }


            const transferOrder = new B2CTransferOrder({
                user: buyer?._id,
                country,
                name,
                email,
                phoneNumber,
                journey: journeyArray,
                totalNetFare: Number(totalNetFare),
                totalNetCost: Number(totalNetCost),
                totalProfit: Number(totalProfit),
                paymentState: "non-paid",
                status:"pending",
                referenceNumber
            })

            await transferOrder.save()

            if(paymentMethod === "ccavenue") {
                const transferOrderPayment = await B2CTransferOrderPayment.create({
                    amount: totalNetFare,
                    orderId: transferOrder?._id,
                    paymentState: "pending",
                    user: buyer?._id,
                    paymentMethod: "ccavenue",
                    paymentStateMessage:''
                })
            }

            return {
                orderId: transferOrder?._id,
                price: Number(totalNetFare),
                cost: Number(totalNetCost),
                profit: Number(totalProfit)
            }
            
        }catch (err){
            console.log(err)
            throw new Error(err)
        }
    },

    createB2cAttractionOrder: async ({
        countryCode,
        name,
        email,
        country,
        phoneNumber,
        referenceNumber,
        selectedActivities,
        paymentMethod,
        req,
        res,
        buyer
    }) => {
        try{
            let totalAmount = 0;
            let totalOfferAmount = 0;

            for(let i = 0; i < selectedActivities?.length; i++){

                if(!isValidObjectId(selectedActivities[i]?.activity)) throw new Error("invalid activity id")

                const activity = await AttractionActivity.findOne({
                    _id: selectedActivities[i]?.activity,
                    isDeleted: false
                })


                if(!activity) throw new Error("Activity not found!")

                const attraction = await Attraction.findOne({
                    _id: activity?.attraction,
                    isDeleted: false,
                    isActive: true
                })

                if(!attraction) throw new Error("attraction not found!")

              
                if (
                    new Date(selectedActivities[i]?.date).setHours(0, 0, 0, 0) <
                    new Date().setHours(0, 0, 0, 0)
                ) {
                    throw new Error(
                        `"selectedActivities[${i}].date" must be a valid date`
                    );
                }

                if (attraction.bookingType === "booking" && attraction.bookingPriorDays) {
                    if (
                        new Date(selectedActivities[i]?.date).setHours(0, 0, 0, 0) <
                        new Date(
                            new Date().setDate(
                                new Date().getDate() + Number(attraction.bookingPriorDays)
                            )
                        ).setHours(0, 0, 0, 0)
                    ) {
                       throw new Error(`"selectedActivities[${i}].date" must be a valid date`)
                    }
                }


                if (
                    attraction.isCustomDate === true &&
                    (new Date(selectedActivities[i]?.date) < new Date(attraction?.startDate) ||
                        new Date(selectedActivities[i]?.date) > new Date(attraction?.endDate))
                ) {
                   throw new Error(
                    `${
                        activity?.name
                    } is not avaialble on your date. Please select a date between ${new Date(
                        attraction?.startDate
                    )?.toDateString()} and ${new Date(attraction?.endDate)?.toDateString()} `
                   )
                }


                const selectedDay = dayNames[new Date(selectedActivities[i]?.date).getDay()]

                const objIndex = attraction.availability?.findIndex((item)=>{
                    return item?.day?.toLowerCase() === selectedDay?.toLowerCase()
                })

                if(objIndex === -1 || attraction.availability[objIndex]?.isEnabled === false) {
                    throw new Error(`sorry, ${activity?.name} is off on ${selectedDay}`)
                }

                for(let j = 0; j < attraction.offDates?.length; j++) {
                    const { from, to } = attraction.offDates[j];

                    if(
                        new Date(selectedActivities[i]?.date) >= new Date(from) &&
                        new Date(selectedActivities[i]?.date) <= new Date(to)
                    ) {
                        throw new Error(
                            `${activity?.name} is off between ${new Date(
                                from
                            )?.toDateString()} and ${new Date(to)?.toDateString()} `
                        )
                    }
                }


                let b2cMarkup = await B2CAttractionMarkup.findOne({
                    activityId: activity?._id
                });

                let adultActivityPrice = activity.adultCost;
                let childActivityPrice = activity.childCost;
                let infantActivityPrice = activity.infantCost;
                let adultActivityTotalPrice = 0;
                let childActivityTotalPrice = 0;
                let infantActivityTotalPrice = 0;
                let adultActivityTotalCost = 0;
                let childActivityTotalCost = 0;
                let infantActivityTotalCost = 0;
                let sharedTransferPrice = activity.sharedTransferPrice;
                let sharedTransferTotalPrice = 0;
                let sharedTransferTotalCost = 0;
                let privateTransfers = [];
                let privateTransfersTotalPrice = 0;
                let privateTransfersTotalCost = 0;
                let totalPax =
                    (Number(selectedActivities[i]?.adultsCount) || 0) +
                    (Number(selectedActivities[i]?.childrenCount) || 0);
                let totalWithoutOffer = 0;
                let offerAmount = 0;
                let grandTotal = 0;
                let promoDiscount = 0;

                if(
                    attraction?._id === "63ff12f5d7333637a938cad4" && 
                    attraction?.isApiConnected &&
                    attraction.bookingType === "booking"
                ) {
                    let ticketData = await getTicketType(
                        selectedActivities[i].slot,
                        activity.productCode,
                        selectedActivities[i].adultsCount,
                        selectedActivities[i].childrenCount
                    )

                    let bookingId = await saveTicket(
                        ticketData,
                        activity.productCode,
                        selectedActivities[i].slot
                    )

                    if(!bookingId) {
                        throw new Error(  "sorry, something went wrong with our end. please try again later")
                    }

                    for (k = 0; k < ticketData.length; k++) {
                        if (ticketData[k].c_TicketTypeCode === "AD") {
                            adultActivityPrice = Number(ticketData[k].i_TicketPrice);
                            activity.adultCost = Number(ticketData[k].i_TicketPrice);
                        } else if (ticketData[k].c_TicketTypeCode === "CH") {
                            childActivityPrice = Number(ticketData[k].i_TicketPrice);
                            activity.childCost = Number(ticketData[k].i_TicketPrice);
                        }
                    }


                    selectedActivities[i].startTime = selectedActivities[i].slot.StartDateTime;
                    selectedActivities[i].endTime = selectedActivities[i].slot.EndDateTime;
                    selectedActivities[i].bookingReferenceNo = bookingId;

                }

                if (activity?.activityType === "transfer") {
                    if (attraction.bookingType === "ticket") {
                        throw new Error(
                            "sorry, this attraction not available at this momemnt"
                        );
                    }
                    if (selectedActivities[i]?.transferType === "without") {
                        throw new Error("please select a transfer option.");
                    } else if (selectedActivities[i]?.transferType === "shared") {
                        if (
                            activity.isSharedTransferAvailable === false ||
                            !sharedTransferPrice ||
                            !activity.sharedTransferCost
                        ) {
                            throw new Error(
                                "this activity doesn't have a shared transfer option"
                            );
                        }

                        if (b2cMarkup) {
                            let markup = 0;
                            if (b2cMarkup?.adultMarkupType === "flat") {
                                markup = b2cMarkup?.adultMarkup;
                            } else {
                                markup = (b2cMarkup?.adultMarkup * sharedTransferPrice) / 100;
                            }
                            sharedTransferPrice += markup;
                        }

                        sharedTransferTotalPrice += sharedTransferPrice * totalPax;
                        sharedTransferTotalCost += activity?.sharedTransferCost * totalPax;
                    } else if (selectedActivities[i]?.transferType === "private") {
                        if (
                            activity.isPrivateTransferAvailable === false ||
                            !activity.privateTransfers ||
                            activity.privateTransfers?.length < 1
                        ) {
                            throw new Error(
                                "this activity doesn't have a private transfer option"
                            );
                        }

                        const sortedPvtTransfers = activity.privateTransfers.sort(
                            (a, b) => a.maxCapacity - b.maxCapacity
                        );

                        let tempPax = totalPax;
                        while (tempPax > 0) {
                            for (let j = 0; j < sortedPvtTransfers.length; j++) {
                                if (
                                    tempPax <= sortedPvtTransfers[j].maxCapacity ||
                                    j === sortedPvtTransfers.length - 1
                                ) {
                                    let currentPax =
                                        tempPax > sortedPvtTransfers[j].maxCapacity
                                            ? sortedPvtTransfers[j].maxCapacity
                                            : tempPax;
                                    let pvtTransferPrice = sortedPvtTransfers[j].price;
                                    let pvtTransferCost = sortedPvtTransfers[j].cost;

                                    if (b2cMarkup) {
                                        let markup = 0;
                                        if (b2cMarkup?.adultMarkupType === "flat") {
                                            markup = b2cMarkup?.adultMarkup;
                                        } else {
                                            markup =
                                                (b2cMarkup?.adultMarkup * pvtTransferPrice) / 100;
                                        }
                                        pvtTransferPrice += markup;
                                    }

                                    privateTransfersTotalPrice += pvtTransferPrice;
                                    privateTransfersTotalCost += pvtTransferCost;
                                    tempPax -= currentPax;

                                    const objIndex = privateTransfers.findIndex((obj) => {
                                        return obj?.pvtTransferId === sortedPvtTransfers[j]?._id;
                                    });

                                    if (objIndex === -1) {
                                        privateTransfers.push({
                                            pvtTransferId: sortedPvtTransfers[j]?._id,
                                            name: sortedPvtTransfers[j].name,
                                            maxCapacity: sortedPvtTransfers[j].maxCapacity,
                                            count: 1,
                                            price: pvtTransferPrice,
                                            cost: sortedPvtTransfers[j].cost,
                                            totalPrice: pvtTransferPrice,
                                        });
                                    } else {
                                        privateTransfers[objIndex].count += 1;
                                        privateTransfers[objIndex].totalPrice += pvtTransferPrice;
                                    }

                                    if (tempPax <= 0) {
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        throw new Error(
                            "please select a valid transfer option."
                        );
                    }
                } else if (activity?.activityType === "normal") {
                    if (attraction.bookingType === "ticket" && !attraction.isApiConnected) {
                        let adultTicketError = false;
                        let childTicketError = false;

                        let commonTickets = await AttractionTicket.find({
                            activity: activity._id,
                            status: "ok",
                            ticketFor: "common",
                            $or: [
                                {
                                    validity: true,
                                    validTill: {
                                        $gte: new Date(selectedActivities[i]?.date).toISOString(),
                                    },
                                },
                                { validity: false },
                            ],
                        }).count();
                        const adultTickets = await AttractionTicket.find({
                            activity: activity._id,
                            status: "ok",
                            ticketFor: "adult",
                            $or: [
                                {
                                    validity: true,
                                    validTill: {
                                        $gte: new Date(selectedActivities[i]?.date).toISOString(),
                                    },
                                },
                                { validity: false },
                            ],
                        }).count();
                        const childrenTickets = await AttractionTicket.find({
                            activity: activity._id,
                            status: "ok",
                            ticketFor: "child",
                            $or: [
                                {
                                    validity: true,
                                    validTill: {
                                        $gte: new Date(selectedActivities[i]?.date).toISOString(),
                                    },
                                },
                                { validity: false },
                            ],
                        }).count();

                        if (adultTickets < Number(selectedActivities[i]?.adultsCount)) {
                            if (
                                commonTickets - adultTickets <
                                Number(selectedActivities[i]?.adultsCount)
                            ) {
                                adultTicketError = true;
                            } else {
                                commonTickets -=
                                    Number(selectedActivities[i]?.adultsCount) - adultTickets;
                            }
                        }

                        if (childrenTickets < Number(selectedActivities[i]?.childrenCount)) {
                            if (
                                commonTickets - childrenTickets <
                                Number(selectedActivities[i]?.childrenCount)
                            ) {
                                childTicketError = true;
                            } else {
                                commonTickets -=
                                    Number(selectedActivities[i]?.childrenCount) - childrenTickets;
                            }
                        }

                        if (adultTicketError || childTicketError) {
                            throw new Error(
                             
                                `${adultTicketError ? "adult tickets" : ""}${
                                    adultTicketError && childTicketError ? " and " : ""
                                }${childTicketError ? "child tickets" : ""} sold out`
                            );
                        }
                    }

                    if (Number(selectedActivities[i]?.adultsCount) > 0) {
                        if (!adultActivityPrice) {
                            throw new Error(
                                "sorry, something went wrong with our end. please try again later"
                            );
                        }

                        if (b2cMarkup) {
                            let markup = 0;
                            if (b2cMarkup.adultMarkupType === "flat") {
                                markup = b2cMarkup.adultMarkup;
                            } else {
                                markup = (b2cMarkup.adultMarkup * adultActivityPrice) / 100;
                            }
                            adultActivityPrice += markup;
                        }

                        adultActivityTotalPrice +=
                            adultActivityPrice * Number(selectedActivities[i]?.adultsCount);
                        if (attraction.bookingType === "booking") {
                            adultActivityTotalCost +=
                                activity.adultCost * Number(selectedActivities[i]?.adultsCount) ||
                                0;
                        }
                    }

                    if (Number(selectedActivities[i]?.childrenCount) > 0) {
                        if (!childActivityPrice) {
                            throw new Error(
                                "sorry, something went wrong with our end. please try again later"
                            );
                        }
                        if (b2cMarkup) {
                            let markup = 0;
                            if (b2cMarkup?.childMarkupType === "flat") {
                                markup = b2cMarkup.childMarkup;
                            } else {
                                markup = (b2cMarkup?.childMarkup * childActivityPrice) / 100;
                            }
                            childActivityPrice += markup;
                        }

                        childActivityTotalPrice +=
                            childActivityPrice * Number(selectedActivities[i]?.childrenCount);
                        if (attraction.bookingType === "booking") {
                            childActivityTotalCost +=
                                activity.childCost * Number(selectedActivities[i]?.childrenCount) ||
                                0;
                        }
                    }

                    if (Number(selectedActivities[i]?.infantCount) > 0 && infantActivityPrice > 0) {
                        if (b2cMarkup) {
                            let markup = 0;
                            if (b2cMarkup?.infantMarkupType === "flat") {
                                markup = b2cMarkup?.infantMarkup;
                            } else {
                                markup = (b2cMarkup?.infantMarkup * infantActivityPrice) / 100;
                            }
                            infantActivityPrice += markup;
                        }

                        infantActivityTotalPrice +=
                            infantActivityPrice * Number(selectedActivities[i]?.infantCount);
                        if (attraction.bookingType === "booking") {
                            infantActivityTotalCost +=
                                activity.infantCost * Number(selectedActivities[i]?.infantCount) ||
                                0;
                        }
                    }

                    if (selectedActivities[i]?.transferType === "shared") {
                        if (
                            activity.isSharedTransferAvailable === false ||
                            !sharedTransferPrice ||
                            !activity.sharedTransferCost
                        ) {
                            throw new Error(
                                "this activity doesn't have a shared transfer option"
                            );
                        }

                        sharedTransferTotalPrice += sharedTransferPrice * totalPax;
                        sharedTransferTotalCost += activity?.sharedTransferCost * totalPax;
                    } else if (selectedActivities[i]?.transferType === "private") {
                        if (
                            activity.isPrivateTransferAvailable === false ||
                            !activity.privateTransfers ||
                            activity.privateTransfers?.length < 1
                        ) {
                            throw new Error(
                              
                                "this activity doesn't have a private transfer option"
                            );
                        }

                        const sortedPvtTransfers = activity.privateTransfers.sort(
                            (a, b) => a.maxCapacity - b.maxCapacity
                        );

                        let tempPax = totalPax;
                        while (tempPax > 0) {
                            for (let j = 0; j < sortedPvtTransfers.length; j++) {
                                if (
                                    tempPax <= sortedPvtTransfers[j].maxCapacity ||
                                    j === sortedPvtTransfers.length - 1
                                ) {
                                    let currentPax =
                                        tempPax > sortedPvtTransfers[j].maxCapacity
                                            ? sortedPvtTransfers[j].maxCapacity
                                            : tempPax;
                                    let pvtTransferPrice = sortedPvtTransfers[j].price;
                                    let pvtTransferCost = sortedPvtTransfers[j].cost;

                                    privateTransfersTotalPrice += pvtTransferPrice;
                                    privateTransfersTotalCost += pvtTransferCost;
                                    tempPax -= currentPax;

                                    const objIndex = privateTransfers.findIndex((obj) => {
                                        return obj?.pvtTransferId === sortedPvtTransfers[j]?._id;
                                    });

                                    if (objIndex === -1) {
                                        privateTransfers.push({
                                            pvtTransferId: sortedPvtTransfers[j]?._id,
                                            name: sortedPvtTransfers[j].name,
                                            maxCapacity: sortedPvtTransfers[j].maxCapacity,
                                            count: 1,
                                            price: pvtTransferPrice,
                                            cost: sortedPvtTransfers[j].cost,
                                            totalPrice: pvtTransferPrice,
                                        });
                                    } else {
                                        privateTransfers[objIndex].count += 1;
                                        privateTransfers[objIndex].totalPrice += pvtTransferPrice;
                                    }

                                    if (tempPax <= 0) {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } else {
                   throw new Error("invalid activity type, please try again");
                }

                // Calculating OFFER
                if (activity?.activityType === "transfer") {
                    let totalWithoutOffer = sharedTransferTotalPrice + privateTransfersTotalPrice;
                    if (attraction?.isOffer) {
                        if (attraction.offerAmountType === "flat") {
                            offerAmount = attraction.offerAmount;
                        } else {
                            offerAmount = (totalWithoutOffer / 100) * attraction.offerAmount;
                        }
                    }
                    grandTotal = totalWithoutOffer - offerAmount;
                } else {
                    let totalWithoutOffer =
                        adultActivityTotalPrice +
                        childActivityTotalPrice +
                        infantActivityTotalPrice;
                    if (attraction?.isOffer) {
                        if (attraction.offerAmountType === "flat") {
                            offerAmount = attraction.offerAmount;
                        } else {
                            offerAmount = (totalWithoutOffer / 100) * attraction.offerAmount;
                        }
                    }
                    totalWithoutOffer += sharedTransferTotalPrice + privateTransfersTotalPrice;
                    grandTotal = totalWithoutOffer - offerAmount;
                } 


                if (selectedActivities[i]?.isPromoAdded === true) {
                    if (activity?.isPromoCode === false || !activity?.promoAmountAdult) {
                        throw new Error(
                            `promo discount not available for ${activity.name}`
                        );
                    }

                    promoDiscount =
                        Number(activity?.promoAmountAdult) *
                            Number(selectedActivities[i]?.adultsCount) +
                            Number(activity?.promoAmountChild) *
                                Number(selectedActivities[i]?.childrenCount) || 0;
                    grandTotal -= Number(promoDiscount);
                }

                selectedActivities[i].activityType = activity.activityType;

                 // ACTIVITY PRICE
                 if (activity.activityType === "normal") {
                    selectedActivities[i].adultActivityPrice = adultActivityPrice || 0;
                    selectedActivities[i].childActivityPrice = childActivityPrice || 0;
                    selectedActivities[i].infantActivityPrice = infantActivityPrice || 0;
                    selectedActivities[i].adultActivityTotalPrice = adultActivityTotalPrice;
                    selectedActivities[i].childActivityTotalPrice = childActivityTotalPrice;
                    selectedActivities[i].infantActivityTotalPrice = infantActivityTotalPrice;
                    // ACTIVITY COST
                    selectedActivities[i].adultActivityCost = activity.adultCost || 0;
                    selectedActivities[i].childActivityCost = activity.childCost || 0;
                    selectedActivities[i].infantActivityCost = activity.infantCost || 0;
                    selectedActivities[i].adultActivityTotalCost = adultActivityTotalCost;
                    selectedActivities[i].childActivityTotalCost = childActivityTotalCost;
                    selectedActivities[i].infantActivityTotalCost = infantActivityTotalCost;
                    selectedActivities[i].promoDiscount = promoDiscount;

                    selectedActivities[i].activityTotalPrice =
                        adultActivityTotalPrice +
                        childActivityTotalPrice +
                        infantActivityTotalPrice;
                    selectedActivities[i].activityTotalCost =
                        adultActivityTotalCost + childActivityTotalCost + infantActivityTotalCost;
                }

                if (selectedActivities[i].transferType === "shared") {
                    selectedActivities[i].sharedTransferPrice = sharedTransferPrice;
                    selectedActivities[i].sharedTransferTotalPrice = sharedTransferTotalPrice;
                    selectedActivities[i].sharedTransferCost = activity.sharedTransferCost;
                    selectedActivities[i].sharedTransferTotalCost = sharedTransferTotalCost;
                }

                if (selectedActivities[i].transferType === "private") {
                    selectedActivities[i].privateTransfers = privateTransfers;
                    selectedActivities[i].privateTransfersTotalPrice = privateTransfersTotalPrice;
                    selectedActivities[i].privateTransfersTotalCost = privateTransfersTotalCost;
                }


                let vatPercentage = 0;
                let totalVat = 0;
                if (activity.isVat) {
                    vatPercentage = activity.vat || 0;
                    if (activity.activityType === "transfer") {
                        totalVat =
                            ((sharedTransferTotalPrice + privateTransfersTotalPrice) / 100) *
                            vatPercentage;
                    } else {
                        totalVat =
                            ((selectedActivities[i].activityTotalPrice || 0) / 100) * vatPercentage;
                    }
                }

                selectedActivities[i].isvat = activity.isVat;
                selectedActivities[i].vatPercentage = vatPercentage;
                selectedActivities[i].totalVat = totalVat;

                selectedActivities[i].grandTotal = grandTotal;
                selectedActivities[i].totalWithoutOffer = totalWithoutOffer;
                selectedActivities[i].offerAmount = offerAmount;
                selectedActivities[i].totalCost =
                    (selectedActivities[i].activityTotalCost || 0) +
                    sharedTransferTotalCost +
                    privateTransfersTotalCost;
                selectedActivities[i].profit = 0;
                selectedActivities[i].status = "pending";
                selectedActivities[i].bookingType = attraction.bookingType;
                selectedActivities[i].attraction = attraction?._id;

                totalAmount += selectedActivities[i].grandTotal;
                totalOfferAmount += offerAmount;

            }


            // Create attraction order
            const newAttractionOrder = new AttractionOrder({
                activities: selectedActivities,
                totalAmount,
                totalOfferAmount,
                user: buyer?._id,
                country,
                name,
                email,
                phoneNumber,
                orderStatus : "pending",
                referenceNumber,
                paymentState: 'non-paid'
            })

            await newAttractionOrder.save()

            return {
                orderId: newAttractionOrder?._id,
                price: totalAmount,
                cost: 0,
                profit: 0
            }
           

        } catch(err) {
            console.log(err)
            throw new Error(err)
        }
    },

    generateB2cOrderSheet: async({
        skip = 0,
        limit = 10,
        bookingType,
        status,
        referenceNo,
        user,
        dateFrom,
        dateTo,
        travellerEmail,
        res,
    })=> {
        try{
            const filters1 = {};

            if(user) {
                filters1.user = Types.ObjectId(user)
            }

            if (referenceNo && referenceNo !== "") {
                filters1.referenceNumber = referenceNo;
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


            const b2cOrder = await B2COrder.find(filters1)
                .populate("user country")
                .select({
                    baseFare: 0,
                    profit: 0
                })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean()

                var wb = new xl.Workbook();
                var ws = wb.addWorksheet("Orders")

                const titleStyle = wb.createStyle({
                    font: {
                        bold: true
                    }
                })

                ws.cell(1, 1).string("Ref No").style(titleStyle);
                ws.cell(1, 2).string("Purchase Date").style(titleStyle);
                ws.cell(1, 3).string("Traveller Name").style(titleStyle);
                ws.cell(1, 4).string("Traveller Email").style(titleStyle);
                ws.cell(1, 5).string("Traveller Country").style(titleStyle);
                ws.cell(1, 6).string("Traveller Phone Number").style(titleStyle);
                ws.cell(1, 7).string("Price").style(titleStyle);
                ws.cell(1, 8).string("Status").style(titleStyle);


                for(let i = 0; i < b2cOrder.length; i++) {
                    const order = b2cOrder[i];
                    ws.cell(i + 2, 1).string(order?.referenceNumber || "N/A")
                    ws.cell(i + 2, 2).string(order?.createdAt ? formatDate(order?.createdAt) : "N/A")
                    ws.cell(i + 2, 3).string(order?.name || "N/A")
                    ws.cell(i + 2, 4).string(order?.email || "N/A")
                    ws.cell(i + 2, 5).string(order?.country?.countryName || "N/A")
                    ws.cell(i + 2, 6).string(order?.country?.phonecode + " " + order?.phoneNumber || "N/A")
                    ws.cell(i + 2, 7).number(Number(order?.netPrice) || 0)
                    ws.cell(i + 2, 8).string(order?.orderStatus || "N/A");

                }

                wb.write(`FileName.xlsx`, res)

        }catch(err){
            throw new Error(err)
        }
    }
}