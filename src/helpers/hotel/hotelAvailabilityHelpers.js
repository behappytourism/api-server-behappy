const { Types } = require("mongoose");
const moment = require("moment");

const {
    HotelContract,
    RoomType,
    HotelBoardType,
    HotelPromotion,
    HotelAddOn,
    HotelAllocation,
} = require("../../models/hotel");
const { getDayName, formatDate } = require("../../utils");
// const { B2bSubAgentHotelMarkup } = require("../../models");
// const B2BClientHotelMarkup = require("../../models/hotel/b2bClientHotelMarkup.model");
const { applyPromotion } = require("./hotelPromotionHelpers");
// const { convertCurrency } = require("../currencyHelpers");

const getSingleDayAvailabilitySG = async ({
    date,
    rooms,
    hotel,
    noOfNights,
    totalAdults,
    totalChildren,
    roomsCount,
    roomTypesWithKeyVal,
    boardTypesWithKeyVal,
    fromDate,
    toDate,
    allContracts,
    allAddOns,
    allAllocations,
}) => {
    try {
        const roomPerDay = { date, rooms: [] };
        const hotelId = hotel?._id;
        const day = getDayName(date);

        if (!hotel?.openDays?.includes(day)) {
            return roomPerDay;
        }

        const contracts = allContracts?.filter((item) => {
            return (
                item?.hotel?.toString() === hotelId?.toString() &&
                new Date(item?.sellFrom) <= new Date(date) &&
                new Date(item?.sellTo) >= new Date(date) &&
                (item?.isSpecialRate === false ||
                    (item?.isSpecialRate === true &&
                        item?.bookingWindowFrom <= new Date(new Date().setHours(0, 0, 0, 0)) &&
                        item?.bookingWindowTo >= new Date(new Date().setHours(0, 0, 0, 0))))
            );
        });

        // const contracts = await HotelContract.find({
        //     hotel: Types.ObjectId(hotelId),
        //     sellFrom: { $lte: new Date(date) },
        //     sellTo: { $gte: new Date(date) },
        //     isDeleted: false,
        //     status: "approved",
        //     $or: [
        //         {
        //             specificNations: true,
        //             applicableNations: nationality?.toUpperCase(),
        //             "applicableNations.0": { $exists: true },
        //         },
        //         { specificNations: false },
        //     ],
        //     $or: [
        //         {
        //             isSpecialRate: true,
        //             bookingWindowFrom: { $lte: new Date() },
        //             bookingWindowTo: { $gte: new Date() },
        //         },
        //         { isSpecialRate: false },
        //     ],
        // })
        //     .populate("contractGroup")
        //     .cache()
        //     .lean();

        if (contracts?.length < 1) {
            return roomPerDay;
        }

        // const addOns = await HotelAddOn.find({
        //     hotel: hotelId,
        //     fromDate: { $lte: new Date(date) },
        //     toDate: { $gte: new Date(date) },
        //     isMandatory: true,
        //     isDeleted: false,
        // }).lean();
        const addOns = allAddOns?.filter((addOn) => {
            return (
                addOn?.hotel?.toString() === hotelId?.toString() &&
                addOn?.isMandatory === true &&
                new Date(addOn?.fromDate) <= new Date(date) &&
                new Date(addOn?.toDate) >= new Date(date)
            );
        });

        for (let i = 0; i < contracts.length; i++) {
            let contract = contracts[i];

            if (contract?.contractGroup?.isDeleted === false) {
                const rooomRates = contract?.roomRates?.filter((item) => {
                    return (
                        new Date(item?.fromDate) <= new Date(date) &&
                        new Date(item?.toDate) >= new Date(date) &&
                        item?.minimumLengthOfStay <= noOfNights &&
                        item?.maximumLengthOfStay >= noOfNights &&
                        item?.validDays?.includes(day)
                    );
                });

                // TODO
                // select only one price
                for (let j = 0; j < rooomRates[0]?.roomTypes?.length; j++) {
                    const roomType = roomTypesWithKeyVal[rooomRates[0]?.roomTypes[j]?.roomTypeId];
                    let isDateExcluded = false;
                    // checking date is excluded or not for applying contract
                    contract?.excludedDates?.map((dateRange) => {
                        if (
                            new Date(dateRange?.fromDate) <= new Date(date) &&
                            new Date(dateRange?.toDate) >= new Date(date) &&
                            dateRange?.roomTypes?.some(
                                (rmType) => rmType?.toString() === roomType?._id?.toString()
                            )
                        ) {
                            isDateExcluded = true;
                        }
                    });
                    if (!roomType || isDateExcluded === true) {
                        continue;
                    }

                    let availableAllocation = 0;
                    let isContractedRate = false;
                    const allocation = allAllocations?.find((item) => {
                        return (
                            item?.hotel?.toString() === hotelId?.toString() &&
                            moment(item?.date).isSame(date, "day") &&
                            item?.roomType?.toString() === roomType?._id?.toString() &&
                            item?.contractGroup?.toString() ===
                                contract?.contractGroup?._id?.toString()
                        );
                    });
                    // const allocation = await HotelAllocation.findOne({
                    //     date: date,
                    //     hotel: hotelId,
                    //     roomType: roomType?._id,
                    //     contractGroup: contract?.contractGroup?._id,
                    // }).lean();
                    if (allocation?.rateType === "contract-rate") {
                        isContractedRate = true;
                    }

                    if (allocation?.allocationType === "static") {
                        availableAllocation = allocation.allocation - allocation.bookedAllocations;
                    } else if (allocation?.allocationType === "free-sale") {
                        availableAllocation = 99 - allocation.bookedAllocations;
                    }

                    const date1 = new Date();
                    const date2 = new Date(date);
                    const diffTime = Math.abs(date2 - date1);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < allocation?.releaseDate) {
                        availableAllocation = 0;
                    }

                    let selectedRoomOccupancies = [];
                    let roomPrice = 0;
                    let extraBedSupplementPrice = 0;
                    let childSupplementPrice = 0;

                    const filteredRoomOccupancies = roomType?.roomOccupancies?.filter((item) => {
                        return item?.isActive === true;
                    });

                    let extrabedAppliedChildren = 0;
                    let extrabedAppliedInfants = 0;
                    let isError = false;
                    for (let op = 0; op < rooms?.length; op++) {
                        let isRoomsPaxOk = false;

                        let totalInfants = 0;
                        let allInfantAges = [];
                        let allChildrenAges = [];
                        for (let ca = 0; ca < rooms[op]?.childrenAges?.length; ca++) {
                            const age = Number(rooms[op]?.childrenAges[ca]);
                            if (age >= roomType?.infantAgeFrom && age <= roomType?.infantAgeTo) {
                                totalInfants++;
                                allInfantAges.push(Number(age));
                            } else {
                                allChildrenAges.push(Number(age));
                            }
                        }

                        for (let k = 0; k < filteredRoomOccupancies?.length; k++) {
                            const roomOccupancy = filteredRoomOccupancies[k];
                            const combinations = roomOccupancy?.combinations?.sort((a, b) => {
                                return b?.adultCount - a?.adultCount;
                            });

                            // @params
                            // runType = noextra, exbed, rollbed, extra
                            const runCombinationMatching = ({ runType }) => {
                                for (let l = 0; l < combinations?.length; l++) {
                                    let combination = combinations[l];

                                    let noOfAdults = Number(rooms[op]?.noOfAdults);
                                    let noOfChildren =
                                        Number(rooms[op]?.noOfChildren) - totalInfants;
                                    let childrenAges = allChildrenAges;
                                    let noOfInfants = totalInfants;
                                    let infantAges = allInfantAges;
                                    let tempExBedSupplementPrice = 0;
                                    let tempChdSupplementPrice = 0;

                                    if (
                                        runType === "noextra" &&
                                        (noOfAdults !== combination?.adultCount ||
                                            noOfChildren !== combination?.childCount ||
                                            noOfInfants !== combination?.infantCount ||
                                            noOfAdults + noOfChildren + noOfInfants >
                                                roomOccupancy?.maxCount)
                                    ) {
                                        continue;
                                    }

                                    if (
                                        runType === "exbed" &&
                                        // (combination?.adultCount + roomOccupancy?.extraBed <
                                        //     noOfAdults ||
                                        //     combination?.childCount + roomOccupancy?.extraBed <
                                        //         noOfChildren ||
                                        //     combination?.infantCount + roomOccupancy?.extraBed <
                                        //         noOfInfants ||
                                        //     roomOccupancy?.maxCount <
                                        //         noOfAdults +
                                        //             noOfChildren +
                                        //             noOfInfants -
                                        //             roomOccupancy?.extraBed)
                                        (noOfAdults < combination?.adultCount ||
                                            noOfAdults >
                                                combination?.adultCount + roomOccupancy?.extraBed ||
                                            noOfChildren < combination?.childCount ||
                                            noOfChildren >
                                                combination?.childCount + roomOccupancy?.extraBed ||
                                            noOfInfants < combination?.infantCount ||
                                            noOfInfants >
                                                combination?.infantCount +
                                                    roomOccupancy?.extraBed ||
                                            noOfAdults +
                                                noOfChildren +
                                                noOfInfants -
                                                roomOccupancy?.extraBed >
                                                roomOccupancy?.maxCount)
                                    ) {
                                        continue;
                                    }

                                    if (
                                        runType === "rollbed" &&
                                        (noOfAdults < combination?.adultCount ||
                                            noOfAdults >
                                                combination?.adultCount + roomOccupancy?.rollBed ||
                                            noOfChildren < combination?.childCount ||
                                            noOfChildren >
                                                combination?.childCount + roomOccupancy?.rollBed ||
                                            noOfInfants < combination?.infantCount ||
                                            noOfInfants >
                                                combination?.infantCount + roomOccupancy?.rollBed ||
                                            noOfAdults +
                                                noOfChildren +
                                                noOfInfants -
                                                roomOccupancy?.rollBed >
                                                roomOccupancy?.maxCount)
                                    ) {
                                        continue;
                                    }

                                    if (
                                        runType === "extra" &&
                                        (noOfAdults < combination?.adultCount ||
                                            noOfAdults >
                                                combination?.adultCount +
                                                    roomOccupancy?.extraBed +
                                                    roomOccupancy?.rollBed ||
                                            noOfChildren < combination?.childCount ||
                                            noOfChildren >
                                                combination?.childCount +
                                                    roomOccupancy?.extraBed +
                                                    roomOccupancy?.rollBed ||
                                            noOfInfants < combination?.infantCount ||
                                            noOfInfants >
                                                combination?.infantCount +
                                                    roomOccupancy?.extraBed +
                                                    roomOccupancy?.rollBed ||
                                            noOfAdults +
                                                noOfChildren +
                                                noOfInfants -
                                                roomOccupancy?.extraBed -
                                                roomOccupancy?.rollBed >
                                                roomOccupancy?.maxCount)
                                    ) {
                                        continue;
                                    }

                                    let extraBedApplied = 0;
                                    let rollBedApplied = 0;
                                    let existingAdult = combination?.adultCount - noOfAdults;
                                    let extraBedAdults =
                                        noOfAdults > combination?.adultCount
                                            ? noOfAdults - combination?.adultCount
                                            : 0;

                                    // adding existing adults occupancy to children
                                    if (noOfChildren > 0 && existingAdult > 0) {
                                        if (noOfChildren >= existingAdult) {
                                            noOfChildren -= existingAdult;
                                            childrenAges.splice(0, existingAdult);
                                            existingAdult = 0;
                                        } else {
                                            existingAdult -= noOfChildren;
                                            noOfChildren = 0;
                                            childrenAges = [];
                                        }
                                    }

                                    // adding existing adults occupancy to infant
                                    if (noOfInfants > 0 && existingAdult > 0) {
                                        if (noOfInfants >= existingAdult) {
                                            noOfInfants -= existingAdult;
                                            infantAges.splice(0, existingAdult);
                                            existingAdult = 0;
                                        } else {
                                            existingAdult -= noOfInfants;
                                            infantAges = [];
                                            noOfInfants = 0;
                                        }
                                    }

                                    let applicableChildren = combination?.childCount || 0;
                                    let applicableInfants = combination?.infantCount || 0;
                                    // adding child policies to existing children and infants
                                    if (noOfInfants > 0 || noOfChildren > 0) {
                                        const filteredChildPolicies =
                                            contract?.childPolicies?.filter((item) => {
                                                return (
                                                    item?.roomTypes?.some(
                                                        (item) =>
                                                            item?.toString() ===
                                                            roomType?._id?.toString()
                                                    ) &&
                                                    new Date(item?.fromDate) <= new Date(date) &&
                                                    new Date(item?.toDate) >= new Date(date)
                                                );
                                            });
                                        if (filteredChildPolicies?.length > 0) {
                                            for (
                                                let cp = 0;
                                                cp < filteredChildPolicies?.length;
                                                // cp < 1;
                                                cp++
                                            ) {
                                                const childPolicy = filteredChildPolicies[cp];
                                                const policiesArr = childPolicy.policies
                                                    ?.map((item) => {
                                                        return {
                                                            ...item,
                                                            totalCharge:
                                                                (item?.beddingCharge || 0) +
                                                                (item?.mealCharge || 0),
                                                        };
                                                    })
                                                    .sort((a, b) => a.totalCharge - b.totalCharge);

                                                if (policiesArr && policiesArr?.length > 0) {
                                                    for (
                                                        let pa = 0;
                                                        pa < policiesArr?.length;
                                                        pa++
                                                    ) {
                                                        const policy = policiesArr[pa];
                                                        let paxCount = policy.paxCount;
                                                        let tempInfantAges = infantAges;
                                                        let tempChildrenAges = JSON.parse(
                                                            JSON.stringify(childrenAges)
                                                        );
                                                        if (noOfInfants > 0) {
                                                            for (
                                                                let ag = 0;
                                                                ag < tempInfantAges?.length;
                                                                ag++
                                                            ) {
                                                                if (
                                                                    tempInfantAges[ag] >=
                                                                        childPolicy?.fromAge &&
                                                                    tempInfantAges[ag] <=
                                                                        childPolicy?.toAge
                                                                ) {
                                                                    if (
                                                                        paxCount > 0 &&
                                                                        noOfInfants > 0 &&
                                                                        applicableInfants > 0
                                                                    ) {
                                                                        if (
                                                                            policy?.beddingIclusive ===
                                                                                true &&
                                                                            policy?.mealInclusive ===
                                                                                true
                                                                        ) {
                                                                            paxCount -= 1;
                                                                            noOfInfants -= 1;
                                                                            applicableInfants -= 1;
                                                                            infantAges.splice(
                                                                                ag,
                                                                                1
                                                                            );
                                                                        } else if (
                                                                            policy?.beddingIclusive ===
                                                                                true &&
                                                                            policy?.mealInclusive ===
                                                                                false
                                                                        ) {
                                                                            paxCount -= 1;
                                                                            noOfInfants -= 1;
                                                                            applicableInfants -= 1;
                                                                            infantAges.splice(
                                                                                ag,
                                                                                1
                                                                            );
                                                                            tempChdSupplementPrice +=
                                                                                policy?.mealCharge ||
                                                                                0;
                                                                        } else if (
                                                                            policy?.beddingIclusive ===
                                                                                false &&
                                                                            policy?.mealInclusive ===
                                                                                true
                                                                        ) {
                                                                            paxCount -= 1;
                                                                            noOfInfants -= 1;
                                                                            applicableInfants -= 1;
                                                                            infantAges.splice(
                                                                                ag,
                                                                                1
                                                                            );
                                                                            tempChdSupplementPrice +=
                                                                                policy?.beddingCharge ||
                                                                                0;
                                                                        } else if (
                                                                            policy?.beddingIclusive ===
                                                                                false &&
                                                                            policy?.mealInclusive ===
                                                                                false
                                                                        ) {
                                                                            paxCount -= 1;
                                                                            noOfInfants -= 1;
                                                                            applicableInfants -= 1;
                                                                            infantAges.splice(
                                                                                ag,
                                                                                1
                                                                            );
                                                                            tempChdSupplementPrice +=
                                                                                policy?.totalCharge ||
                                                                                0;
                                                                        }
                                                                    } else {
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        if (noOfChildren > 0) {
                                                            for (
                                                                let ag = 0;
                                                                ag < tempChildrenAges?.length;
                                                                ag++
                                                            ) {
                                                                if (
                                                                    tempChildrenAges[ag] >=
                                                                        childPolicy?.fromAge &&
                                                                    tempChildrenAges[ag] <=
                                                                        childPolicy?.toAge
                                                                ) {
                                                                    if (
                                                                        paxCount > 0 &&
                                                                        noOfChildren > 0 &&
                                                                        applicableChildren > 0
                                                                    ) {
                                                                        if (
                                                                            policy?.beddingIclusive ===
                                                                                true &&
                                                                            policy?.mealInclusive ===
                                                                                true
                                                                        ) {
                                                                            paxCount -= 1;
                                                                            noOfChildren -= 1;
                                                                            applicableChildren -= 1;
                                                                            childrenAges.splice(
                                                                                ag,
                                                                                1
                                                                            );
                                                                        } else if (
                                                                            policy?.beddingIclusive ===
                                                                                true &&
                                                                            policy?.mealInclusive ===
                                                                                false
                                                                        ) {
                                                                            paxCount -= 1;
                                                                            noOfChildren -= 1;
                                                                            applicableChildren -= 1;
                                                                            childrenAges.splice(
                                                                                ag,
                                                                                1
                                                                            );
                                                                            tempChdSupplementPrice +=
                                                                                policy?.mealCharge;
                                                                        } else if (
                                                                            policy?.beddingIclusive ===
                                                                                false &&
                                                                            policy?.mealInclusive ===
                                                                                true
                                                                        ) {
                                                                            paxCount -= 1;
                                                                            noOfChildren -= 1;
                                                                            applicableChildren -= 1;
                                                                            childrenAges.splice(
                                                                                ag,
                                                                                1
                                                                            );
                                                                            tempChdSupplementPrice +=
                                                                                policy?.beddingCharge;
                                                                        } else if (
                                                                            policy?.beddingIclusive ===
                                                                                false &&
                                                                            policy?.mealInclusive ===
                                                                                false
                                                                        ) {
                                                                            paxCount -= 1;
                                                                            noOfChildren -= 1;
                                                                            applicableChildren -= 1;
                                                                            childrenAges.splice(
                                                                                ag,
                                                                                1
                                                                            );
                                                                            tempChdSupplementPrice +=
                                                                                policy?.totalCharge;
                                                                        } else {
                                                                            break;
                                                                        }
                                                                    } else {
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    // applying extra bed to existing adult, children, and infants
                                    let totalExtraBeds = roomOccupancy?.extraBed;
                                    let totalRollBeds = roomOccupancy?.rollBed;
                                    if (
                                        (extraBedAdults > 0 ||
                                            noOfChildren > 0 ||
                                            noOfInfants > 0) &&
                                        (totalExtraBeds > 0 || totalRollBeds > 0)
                                    ) {
                                        const filteredExtraSupplements =
                                            contract?.extraSupplements?.filter((item) => {
                                                return (
                                                    item?.roomTypes?.some(
                                                        (item) =>
                                                            item?.toString() ===
                                                            roomType?._id?.toString()
                                                    ) &&
                                                    new Date(item?.fromDate) <= new Date(date) &&
                                                    new Date(item?.toDate) >= new Date(date)
                                                );
                                            });

                                        if (filteredExtraSupplements?.length > 0) {
                                            const filteredExtraSupplement =
                                                filteredExtraSupplements[0];

                                            const exbedAdultPrice =
                                                filteredExtraSupplement?.isMealIncluded === true
                                                    ? filteredExtraSupplement?.extraBedAdultPrice
                                                    : filteredExtraSupplement?.extraBedAdultPrice +
                                                      (filteredExtraSupplement?.exbMealPriceAdult ||
                                                          0);
                                            const exbedChildPrice =
                                                filteredExtraSupplement?.isMealIncluded === true
                                                    ? filteredExtraSupplement?.extraBedChildPrice
                                                    : filteredExtraSupplement?.extraBedChildPrice +
                                                      (filteredExtraSupplement?.exbMealPriceChild ||
                                                          0);

                                            // applying extra bed
                                            if (runType === "exbed" || runType === "extra") {
                                                if (totalExtraBeds > 0 && extraBedAdults > 0) {
                                                    if (totalExtraBeds <= extraBedAdults) {
                                                        extraBedApplied += totalExtraBeds;
                                                        tempExBedSupplementPrice +=
                                                            exbedAdultPrice * totalExtraBeds;
                                                        extraBedAdults -= totalExtraBeds;
                                                        totalExtraBeds = 0;
                                                    } else {
                                                        extraBedApplied += extraBedAdults;
                                                        tempExBedSupplementPrice +=
                                                            exbedAdultPrice * extraBedAdults;
                                                        totalExtraBeds -= extraBedAdults;
                                                        extraBedAdults = 0;
                                                    }
                                                }

                                                if (totalExtraBeds > 0 && noOfChildren > 0) {
                                                    if (totalExtraBeds <= noOfChildren) {
                                                        extraBedApplied += totalExtraBeds;
                                                        tempExBedSupplementPrice +=
                                                            exbedChildPrice * totalExtraBeds;
                                                        noOfChildren -= totalExtraBeds;
                                                        extrabedAppliedChildren += totalExtraBeds;
                                                        totalExtraBeds = 0;
                                                    } else {
                                                        extraBedApplied += noOfChildren;
                                                        tempExBedSupplementPrice +=
                                                            exbedChildPrice * noOfChildren;
                                                        totalExtraBeds -= noOfChildren;
                                                        extrabedAppliedChildren += noOfChildren;
                                                        noOfChildren = 0;
                                                    }
                                                }
                                                if (totalExtraBeds > 0 && noOfInfants > 0) {
                                                    if (totalExtraBeds <= noOfInfants) {
                                                        extraBedApplied += totalExtraBeds;
                                                        tempExBedSupplementPrice +=
                                                            exbedChildPrice * totalExtraBeds;
                                                        noOfInfants -= totalExtraBeds;
                                                        extrabedAppliedInfants += totalExtraBeds;
                                                        totalExtraBeds = 0;
                                                    } else {
                                                        extraBedApplied += noOfInfants;
                                                        tempExBedSupplementPrice +=
                                                            exbedChildPrice * noOfInfants;
                                                        totalExtraBeds -= noOfInfants;
                                                        extrabedAppliedInfants += noOfInfants;
                                                        noOfInfants = 0;
                                                    }
                                                }
                                            }

                                            // applying roll away bed
                                            if (runType === "rollbed" || runType === "extra") {
                                                if (totalRollBeds > 0 && extraBedAdults > 0) {
                                                    if (totalRollBeds <= extraBedAdults) {
                                                        rollBedApplied += totalRollBeds;
                                                        tempExBedSupplementPrice +=
                                                            exbedAdultPrice * totalRollBeds;
                                                        extraBedAdults -= totalRollBeds;
                                                        totalRollBeds = 0;
                                                    } else {
                                                        rollBedApplied += extraBedAdults;
                                                        tempExBedSupplementPrice +=
                                                            exbedAdultPrice * extraBedAdults;
                                                        totalRollBeds -= extraBedAdults;
                                                        extraBedAdults = 0;
                                                    }
                                                }
                                                if (totalRollBeds > 0 && noOfChildren > 0) {
                                                    if (totalRollBeds <= noOfChildren) {
                                                        rollBedApplied += totalRollBeds;
                                                        tempExBedSupplementPrice +=
                                                            exbedChildPrice * totalRollBeds;
                                                        noOfChildren -= totalRollBeds;
                                                        extrabedAppliedChildren += totalRollBeds;
                                                        totalRollBeds = 0;
                                                    } else {
                                                        rollBedApplied += noOfChildren;
                                                        tempExBedSupplementPrice +=
                                                            exbedChildPrice * noOfChildren;
                                                        totalRollBeds -= noOfChildren;
                                                        extrabedAppliedChildren += noOfChildren;
                                                        noOfChildren = 0;
                                                    }
                                                }
                                                if (totalRollBeds > 0 && noOfInfants > 0) {
                                                    if (totalRollBeds <= noOfInfants) {
                                                        rollBedApplied += totalRollBeds;
                                                        tempExBedSupplementPrice +=
                                                            exbedChildPrice * totalRollBeds;
                                                        noOfInfants -= totalRollBeds;
                                                        extrabedAppliedInfants += totalRollBeds;
                                                        totalRollBeds = 0;
                                                    } else {
                                                        rollBedApplied += noOfInfants;
                                                        tempExBedSupplementPrice +=
                                                            exbedChildPrice * noOfInfants;
                                                        totalRollBeds -= noOfInfants;
                                                        extrabedAppliedInfants += noOfInfants;
                                                        noOfInfants = 0;
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    if (noOfInfants > 0 || noOfChildren > 0 || extraBedAdults > 0) {
                                        continue;
                                    } else {
                                        const rateOccupancyIndex = rooomRates[0]?.roomTypes[
                                            j
                                        ]?.roomOccupancies?.findIndex((item) => {
                                            return (
                                                item?.occupancyId?.toString() ===
                                                roomOccupancy?._id?.toString()
                                            );
                                        });

                                        if (
                                            rateOccupancyIndex === -1 ||
                                            !rooomRates[0]?.roomTypes[j]?.roomOccupancies[
                                                rateOccupancyIndex
                                            ]?.price
                                        ) {
                                            continue;
                                        }

                                        roomPrice +=
                                            rooomRates[0]?.roomTypes[j]?.roomOccupancies[
                                                rateOccupancyIndex
                                            ]?.price;
                                        extraBedSupplementPrice += tempExBedSupplementPrice;
                                        childSupplementPrice += tempChdSupplementPrice;

                                        selectedRoomOccupancies.push({
                                            roomKey: op + 1,
                                            occupancyId: roomOccupancy?._id,
                                            occupancyName:
                                                extraBedApplied > 0 && roomOccupancy?.displayName
                                                    ? roomOccupancy?.displayName
                                                    : roomOccupancy?.occupancyName,
                                            shortName: roomOccupancy?.shortName,
                                            count: 1,
                                            price: rooomRates[0]?.roomTypes[j]?.roomOccupancies[
                                                rateOccupancyIndex
                                            ]?.price,
                                            extraBedApplied,
                                            rollBedApplied,
                                        });

                                        isRoomsPaxOk = true;
                                        break;
                                    }
                                }
                            };

                            // run without exbed and rollbed
                            runCombinationMatching({ runType: "noextra" });
                            if (isRoomsPaxOk === true) {
                                break;
                            }
                            // run with exbed
                            if (roomOccupancy?.extraBed > 0) {
                                runCombinationMatching({ runType: "exbed" });
                                if (isRoomsPaxOk === true) {
                                    break;
                                }
                            }
                            // run with rollbed
                            if (roomOccupancy?.rollBed > 0) {
                                runCombinationMatching({ runType: "rollbed" });
                                if (isRoomsPaxOk === true) {
                                    break;
                                }
                            }
                            // run with exbed and rollbed
                            if (roomOccupancy?.extraBed > 0 && roomOccupancy?.rollBed > 0) {
                                runCombinationMatching({ runType: "extra" });
                                if (isRoomsPaxOk === true) {
                                    break;
                                }
                            }
                        }

                        if (isRoomsPaxOk === false) {
                            isError = true;
                            break;
                        }
                    }

                    if (isError === false) {
                        let totalInfants = 0;
                        for (let rm = 0; rm < rooms?.length; rm++) {
                            for (let ca = 0; ca < rooms[rm]?.childrenAges?.length; ca++) {
                                const age = Number(rooms[rm]?.childrenAges[ca]);
                                if (
                                    age >= roomType?.infantAgeFrom &&
                                    age <= roomType?.infantAgeTo
                                ) {
                                    totalInfants++;
                                }
                            }
                        }

                        const filteredAddOns = addOns.filter((item) => {
                            return (
                                item?.roomTypes?.some(
                                    (item) => item?.toString() === roomType?._id?.toString()
                                ) &&
                                item?.boardTypes?.some(
                                    (item) => item?.toString() === contract?.basePlan?.toString()
                                )
                            );
                        });

                        let sortedAddOns = [];

                        let mandatoryAddOnPrice = 0;
                        let totalAddOnPrice = 0;
                        if (filteredAddOns?.length > 0) {
                            sortedAddOns = filteredAddOns?.map((item) => {
                                if (item?.applyOn === "pax") {
                                    mandatoryAddOnPrice += item?.adultPrice * totalAdults;
                                    mandatoryAddOnPrice +=
                                        item?.childPrice * (totalChildren - totalInfants);
                                    mandatoryAddOnPrice += item?.infantPrice * totalInfants;
                                } else if (item?.applyOn === "room") {
                                    mandatoryAddOnPrice += item?.roomPrice * roomsCount;
                                } else {
                                    throw new Error("something went wrong on mandatory addons");
                                }

                                return {
                                    dates: [date],
                                    addOnId: item?._id,
                                    addOnName: item?.addOnName,
                                };
                            });
                            totalAddOnPrice = mandatoryAddOnPrice;
                        }

                        let filteredCancellationPolicies = [];
                        if (
                            contract?.cancellationPolicies?.length < 1 &&
                            contract.isSpecialRate === true &&
                            contract?.parentContract?.cancellationPolicies?.length > 0
                        ) {
                            filteredCancellationPolicies =
                                contract?.parentContract?.cancellationPolicies?.filter((item) => {
                                    return (
                                        new Date(item?.fromDate) <= new Date(date) &&
                                        new Date(item?.toDate) >= new Date(date) &&
                                        item?.roomTypes?.some(
                                            (item) => item?.toString() === roomType?._id?.toString()
                                        )
                                    );
                                });
                        } else if (contract?.cancellationPolicies?.length > 0) {
                            filteredCancellationPolicies = contract?.cancellationPolicies?.filter(
                                (item) => {
                                    return (
                                        new Date(item?.fromDate) <= new Date(date) &&
                                        new Date(item?.toDate) >= new Date(date) &&
                                        item?.roomTypes?.some(
                                            (item) => item?.toString() === roomType?._id?.toString()
                                        )
                                    );
                                }
                            );
                        }

                        const objIndex = roomPerDay?.rooms.findIndex((obj) => {
                            return obj?.roomTypeId?.toString() === roomType?._id?.toString();
                        });

                        if (boardTypesWithKeyVal[contract?.basePlan]) {
                            if (objIndex === -1) {
                                roomPerDay?.rooms.push({
                                    roomTypeId: roomType?._id,
                                    roomType: {
                                        _id: roomType?._id,
                                        roomName: roomType?.roomName,
                                        serviceBy: roomType?.serviceBy,
                                        amenities: roomType?.amenities,
                                        areaInM2: roomType?.areaInM2,
                                        images: roomType?.images,
                                    },
                                    rates: [
                                        {
                                            rateKey: `TCTT|${fromDate}|${toDate}|${hotelId}|${
                                                roomType?._id
                                            }|${
                                                boardTypesWithKeyVal[contract?.basePlan]
                                                    ?.boardShortName
                                            }||`,
                                            rateName: `${roomType?.roomName} with ${
                                                boardTypesWithKeyVal[contract?.basePlan]?.boardName
                                            }`,
                                            boardName:
                                                boardTypesWithKeyVal[contract?.basePlan]?.boardName,
                                            boardCode:
                                                boardTypesWithKeyVal[contract?.basePlan]
                                                    ?.boardShortName,
                                            basePlan: contract?.basePlan,
                                            contractGroup: contract?.contractGroup?._id,
                                            contract: contract?._id,
                                            isSpecialRate: contract?.isSpecialRate,
                                            appliedRateCode: contract?.roomRates[0].rateCode,
                                            applyPromotion: contract?.applyPromotion,
                                            priority: contract?.priority,
                                            selectedRoomOccupancies,
                                            mealSupplement: {
                                                _id: "",
                                                mealSupplementName: "",
                                                mealSupplementShortName: "",
                                            },
                                            mealSupplementPrice: 0,
                                            roomPrice,
                                            netPrice:
                                                roomPrice +
                                                totalAddOnPrice +
                                                extraBedSupplementPrice +
                                                childSupplementPrice,
                                            extraBedSupplementPrice,
                                            childSupplementPrice,
                                            mandatoryAddOns: sortedAddOns,
                                            mandatoryAddOnPrice,
                                            totalAddOnPrice,
                                            allocationType: allocation?.allocationType,
                                            availableAllocation,
                                            isContractedRate,
                                            cancellationPolicies: filteredCancellationPolicies,
                                            isTourismFeeIncluded: contract.isTourismFeeIncluded,
                                            rateComments: [
                                                contract.isTourismFeeIncluded === true
                                                    ? "price includes mandatory tourism fees."
                                                    : "price excludes mandatory tourism fees and is payable directly at the hotel.",
                                            ],
                                        },
                                    ],
                                });
                            } else {
                                const basePlanIndex = roomPerDay?.rooms[objIndex]?.rates?.findIndex(
                                    (obj) => {
                                        return (
                                            obj?.basePlan?.toString() ===
                                                contract?.basePlan?.toString() &&
                                            obj?.mealSupplement?._id === ""
                                        );
                                    }
                                );

                                if (basePlanIndex === -1) {
                                    roomPerDay?.rooms[objIndex]?.rates?.push({
                                        rateKey: `TCTT|${fromDate}|${toDate}|${hotelId}|${
                                            roomType?._id
                                        }|${
                                            boardTypesWithKeyVal[contract?.basePlan]?.boardShortName
                                        }||`,
                                        rateName: `${roomType?.roomName} with ${
                                            boardTypesWithKeyVal[contract?.basePlan]?.boardName
                                        }`,
                                        boardName:
                                            boardTypesWithKeyVal[contract?.basePlan]?.boardName,
                                        boardCode:
                                            boardTypesWithKeyVal[contract?.basePlan]
                                                ?.boardShortName,
                                        contractGroup: contract?.contractGroup?._id,
                                        contract: contract?._id,
                                        isSpecialRate: contract?.isSpecialRate,
                                        appliedRateCode: contract?.roomRates[0].rateCode,
                                        applyPromotion: contract?.applyPromotion,
                                        basePlan: contract?.basePlan,
                                        priority: contract?.priority,
                                        selectedRoomOccupancies,
                                        mealSupplement: {
                                            _id: "",
                                            mealSupplementName: "",
                                            mealSupplementShortName: "",
                                        },
                                        mealSupplementPrice: 0,
                                        roomPrice,
                                        netPrice:
                                            roomPrice +
                                            totalAddOnPrice +
                                            extraBedSupplementPrice +
                                            childSupplementPrice,
                                        extraBedSupplementPrice,
                                        childSupplementPrice,
                                        mandatoryAddOns: sortedAddOns,
                                        mandatoryAddOnPrice,
                                        totalAddOnPrice,
                                        allocationType: allocation?.allocationType,
                                        availableAllocation,
                                        isContractedRate,
                                        cancellationPolicies: filteredCancellationPolicies,
                                        isTourismFeeIncluded: contract.isTourismFeeIncluded,
                                        rateComments: [
                                            contract.isTourismFeeIncluded === true
                                                ? "price includes mandatory tourism fees."
                                                : "price excludes mandatory tourism fees and is payable directly at the hotel.",
                                        ],
                                    });
                                } else {
                                    if (
                                        roomPerDay?.rooms[objIndex]?.rates[basePlanIndex]
                                            ?.priority < contract?.priority
                                    ) {
                                        roomPerDay.rooms[objIndex].rates[basePlanIndex].contract =
                                            contract?._id;
                                        roomPerDay.rooms[objIndex].rates[
                                            basePlanIndex
                                        ].isSpecialRate = contract?.isSpecialRate;
                                        roomPerDay.rooms[objIndex].rates[
                                            basePlanIndex
                                        ].appliedRateCode = contract?.roomRates[0].rateCode;
                                        roomPerDay.rooms[objIndex].rates[
                                            basePlanIndex
                                        ].applyPromotion = contract?.applyPromotion;
                                        roomPerDay.rooms[objIndex].rates[
                                            basePlanIndex
                                        ].contractGroup = contract?.contractGroup?._id;
                                        roomPerDay.rooms[objIndex].rates[basePlanIndex].priority =
                                            contract?.priority;
                                        roomPerDay.rooms[objIndex].rates[basePlanIndex].roomPrice =
                                            roomPrice;
                                        roomPerDay.rooms[objIndex].rates[basePlanIndex].netPrice =
                                            roomPrice +
                                            totalAddOnPrice +
                                            extraBedSupplementPrice +
                                            childSupplementPrice;
                                        roomPerDay.rooms[objIndex].rates[
                                            basePlanIndex
                                        ].extraBedSupplementPrice = extraBedSupplementPrice;
                                        roomPerDay.rooms[objIndex].rates[
                                            basePlanIndex
                                        ].childSupplementPrice = childSupplementPrice;
                                        roomPerDay.rooms[objIndex].rates[
                                            basePlanIndex
                                        ].cancellationPolicies = filteredCancellationPolicies;

                                        roomPerDay.rooms[objIndex].rates[
                                            basePlanIndex
                                        ].mandatoryAddOns = sortedAddOns;
                                        roomPerDay.rooms[objIndex].rates[
                                            basePlanIndex
                                        ].mandatoryAddOnPrice = mandatoryAddOnPrice;
                                        roomPerDay.rooms[objIndex].rates[
                                            basePlanIndex
                                        ].totalAddOnPrice = totalAddOnPrice;
                                        roomPerDay.rooms[objIndex].rates[
                                            basePlanIndex
                                        ].isTourismFeeIncluded = contract.isTourismFeeIncluded;
                                        roomPerDay.rooms[objIndex].rates[
                                            basePlanIndex
                                        ].rateComments = [
                                            contract.isTourismFeeIncluded === true
                                                ? "price includes mandatory tourism fees."
                                                : "price excludes mandatory tourism fees and is payable directly at the hotel.",
                                        ];
                                    } else if (
                                        roomPerDay?.rooms[objIndex]?.rates[basePlanIndex]
                                            ?.priority === contract?.priority
                                    ) {
                                        roomPerDay?.rooms[objIndex]?.rates?.push({
                                            rateKey: `TCTT|${fromDate}|${toDate}|${hotelId}|${
                                                roomType?._id
                                            }|${
                                                boardTypesWithKeyVal[contract?.basePlan]
                                                    ?.boardShortName
                                            }||`,
                                            rateName: `${roomType?.roomName} with ${
                                                boardTypesWithKeyVal[contract?.basePlan]?.boardName
                                            }`,
                                            boardName:
                                                boardTypesWithKeyVal[contract?.basePlan]?.boardName,
                                            boardCode:
                                                boardTypesWithKeyVal[contract?.basePlan]
                                                    ?.boardShortName,
                                            contractGroup: contract?.contractGroup?._id,
                                            contract: contract?._id,
                                            isSpecialRate: contract?.isSpecialRate,
                                            appliedRateCode: contract?.roomRates[0].rateCode,
                                            applyPromotion: contract?.applyPromotion,
                                            basePlan: contract?.basePlan,
                                            priority: contract?.priority,
                                            selectedRoomOccupancies,
                                            mealSupplement: {
                                                _id: "",
                                                mealSupplementName: "",
                                                mealSupplementShortName: "",
                                            },
                                            mealSupplementPrice: 0,
                                            roomPrice,
                                            netPrice:
                                                roomPrice +
                                                totalAddOnPrice +
                                                extraBedSupplementPrice +
                                                childSupplementPrice,
                                            extraBedSupplementPrice,
                                            childSupplementPrice,
                                            mandatoryAddOns: sortedAddOns,
                                            mandatoryAddOnPrice,
                                            totalAddOnPrice,
                                            allocationType: allocation?.allocationType,
                                            availableAllocation,
                                            isContractedRate,
                                            cancellationPolicies: filteredCancellationPolicies,
                                            isTourismFeeIncluded: contract.isTourismFeeIncluded,
                                            rateComments: [
                                                contract.isTourismFeeIncluded === true
                                                    ? "price includes mandatory tourism fees."
                                                    : "price excludes mandatory tourism fees and is payable directly at the hotel.",
                                            ],
                                        });
                                    }
                                }
                            }
                        }

                        const mealSupplements = contract.mealSupplements?.filter((item) => {
                            return (
                                new Date(item?.fromDate) <= new Date(date) &&
                                new Date(item?.toDate) >= new Date(date) &&
                                item?.roomTypes?.some(
                                    (item) => item?.toString() === roomType?._id?.toString()
                                )
                            );
                        });

                        if (
                            mealSupplements.length > 0 &&
                            boardTypesWithKeyVal[contract?.basePlan]
                        ) {
                            for (let ab = 0; ab < mealSupplements.length; ab++) {
                                if (boardTypesWithKeyVal[mealSupplements[ab]?.boardType]) {
                                    const mealSupplementPrice =
                                        totalAdults * mealSupplements[ab]?.adultPrice +
                                        extrabedAppliedInfants * mealSupplements[ab]?.infantPrice +
                                        extrabedAppliedChildren * mealSupplements[ab]?.childPrice;

                                    const objIndex = roomPerDay?.rooms.findIndex((obj) => {
                                        return (
                                            obj?.roomTypeId?.toString() ===
                                            roomType?._id?.toString()
                                        );
                                    });
                                    if (objIndex === -1) {
                                        roomPerDay?.rooms.push({
                                            roomTypeId: roomType?._id,
                                            roomType: {
                                                _id: roomType?._id,
                                                roomName: roomType?.roomName,
                                                serviceBy: roomType?.serviceBy,
                                                amenities: [],
                                                areaInM2: roomType?.areaInM2,
                                                images: roomType?.images,
                                            },
                                            rates: [
                                                {
                                                    rateKey: `TCTT|${fromDate}|${toDate}|${hotelId}|${
                                                        roomType?._id
                                                    }|${
                                                        boardTypesWithKeyVal[contract?.basePlan]
                                                            ?.boardShortName
                                                    }|${
                                                        boardTypesWithKeyVal[
                                                            mealSupplements[ab]?.boardType
                                                        ]?.boardShortName
                                                    }|`,
                                                    rateName: `${roomType?.roomName} with ${
                                                        boardTypesWithKeyVal[
                                                            mealSupplements[ab]?.boardType
                                                        ]?.displayName
                                                            ? boardTypesWithKeyVal[
                                                                  mealSupplements[ab]?.boardType
                                                              ]?.displayName
                                                            : boardTypesWithKeyVal[
                                                                  mealSupplements[ab]?.boardType
                                                              ]?.boardName
                                                    }`,
                                                    boardName:
                                                        boardTypesWithKeyVal[
                                                            mealSupplements[ab]?.boardType
                                                        ]?.boardName,
                                                    boardCode:
                                                        boardTypesWithKeyVal[
                                                            mealSupplements[ab]?.boardType
                                                        ]?.boardShortName,
                                                    contractGroup: contract?.contractGroup?._id,
                                                    contract: contract?._id,
                                                    isSpecialRate: contract?.isSpecialRate,
                                                    appliedRateCode:
                                                        contract?.roomRates[0].rateCode,
                                                    applyPromotion: contract?.applyPromotion,
                                                    basePlan: contract?.basePlan,
                                                    priority: contract?.priority,
                                                    selectedRoomOccupancies,
                                                    mealSupplement: {
                                                        _id: mealSupplements[ab]?.boardType,
                                                        mealSupplementName:
                                                            boardTypesWithKeyVal[
                                                                mealSupplements[ab]?.boardType
                                                            ]?.boardName,
                                                        mealSupplementShortName:
                                                            boardTypesWithKeyVal[
                                                                mealSupplements[ab]?.boardType
                                                            ]?.boardShortName,
                                                    },
                                                    mealSupplementPrice,
                                                    roomPrice,
                                                    netPrice:
                                                        roomPrice +
                                                        mealSupplementPrice +
                                                        totalAddOnPrice +
                                                        extraBedSupplementPrice +
                                                        childSupplementPrice,
                                                    extraBedSupplementPrice,
                                                    childSupplementPrice,
                                                    mandatoryAddOns: sortedAddOns,
                                                    mandatoryAddOnPrice,
                                                    totalAddOnPrice,
                                                    allocationType: allocation?.allocationType,
                                                    availableAllocation,
                                                    isContractedRate,
                                                    cancellationPolicies:
                                                        filteredCancellationPolicies,
                                                    isTourismFeeIncluded:
                                                        contract.isTourismFeeIncluded,
                                                    rateComments: [
                                                        contract.isTourismFeeIncluded === true
                                                            ? "price includes mandatory tourism fees."
                                                            : "price excludes mandatory tourism fees and is payable directly at the hotel.",
                                                    ],
                                                },
                                            ],
                                        });
                                    } else {
                                        const basePlanIndex = roomPerDay?.rooms[
                                            objIndex
                                        ]?.rates?.findIndex((obj) => {
                                            return (
                                                obj?.basePlan?.toString() ===
                                                    contract?.basePlan?.toString() &&
                                                obj?.mealSupplement?._id?.toString() ===
                                                    mealSupplements[ab]?.boardType?.toString()
                                            );
                                        });

                                        if (basePlanIndex === -1) {
                                            roomPerDay?.rooms[objIndex]?.rates?.push({
                                                rateKey: `TCTT|${fromDate}|${toDate}|${hotelId}|${
                                                    roomType?._id
                                                }|${
                                                    boardTypesWithKeyVal[contract?.basePlan]
                                                        ?.boardShortName
                                                }|${
                                                    boardTypesWithKeyVal[
                                                        mealSupplements[ab]?.boardType
                                                    ]?.boardShortName
                                                }|`,
                                                rateName: `${roomType?.roomName} with ${
                                                    boardTypesWithKeyVal[
                                                        mealSupplements[ab]?.boardType
                                                    ]?.boardName
                                                }`,
                                                boardName:
                                                    boardTypesWithKeyVal[
                                                        mealSupplements[ab]?.boardType
                                                    ]?.boardName,
                                                boardCode:
                                                    boardTypesWithKeyVal[
                                                        mealSupplements[ab]?.boardType
                                                    ]?.boardShortName,
                                                contractGroup: contract?.contractGroup?._id,
                                                contract: contract?._id,
                                                isSpecialRate: contract?.isSpecialRate,
                                                appliedRateCode: contract?.roomRates[0].rateCode,
                                                applyPromotion: contract?.applyPromotion,
                                                basePlan: contract?.basePlan,
                                                priority: contract?.priority,
                                                selectedRoomOccupancies,
                                                mealSupplement: {
                                                    _id: mealSupplements[ab]?.boardType,
                                                    mealSupplementName:
                                                        boardTypesWithKeyVal[
                                                            mealSupplements[ab]?.boardType
                                                        ]?.boardName,
                                                    mealSupplementShortName:
                                                        boardTypesWithKeyVal[
                                                            mealSupplements[ab]?.boardType
                                                        ]?.boardShortName,
                                                },
                                                mealSupplementPrice,
                                                roomPrice,
                                                netPrice:
                                                    roomPrice +
                                                    mealSupplementPrice +
                                                    totalAddOnPrice +
                                                    extraBedSupplementPrice +
                                                    childSupplementPrice,
                                                extraBedSupplementPrice,
                                                childSupplementPrice,
                                                mandatoryAddOns: sortedAddOns,
                                                mandatoryAddOnPrice,
                                                totalAddOnPrice,
                                                allocationType: allocation?.allocationType,
                                                availableAllocation,
                                                isContractedRate,
                                                cancellationPolicies: filteredCancellationPolicies,
                                                isTourismFeeIncluded: contract.isTourismFeeIncluded,
                                                rateComments: [
                                                    contract.isTourismFeeIncluded === true
                                                        ? "price includes mandatory tourism fees."
                                                        : "price excludes mandatory tourism fees and is payable directly at the hotel.",
                                                ],
                                            });
                                        } else {
                                            if (
                                                roomPerDay?.rooms[objIndex]?.rates[basePlanIndex]
                                                    ?.priority < contract?.priority
                                            ) {
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].contract = contract?._id;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].isSpecialRate = contract?.isSpecialRate;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].appliedRateCode = contract?.roomRates[0].rateCode;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].applyPromotion = contract?.applyPromotion;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].contractGroup = contract?.contractGroup?._id;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].priority = contract?.priority;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].mealSupplementPrice = mealSupplementPrice;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].roomPrice = roomPrice;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].netPrice =
                                                    roomPrice +
                                                    mealSupplementPrice +
                                                    totalAddOnPrice +
                                                    extraBedSupplementPrice +
                                                    childSupplementPrice;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].extraBedSupplementPrice = extraBedSupplementPrice;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].childSupplementPrice = childSupplementPrice;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].cancellationPolicies =
                                                    filteredCancellationPolicies;

                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].mandatoryAddOns = sortedAddOns;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].mandatoryAddOnPrice = mandatoryAddOnPrice;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].totalAddOnPrice = totalAddOnPrice;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].isTourismFeeIncluded =
                                                    contract.isTourismFeeIncluded;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].rateComments = [
                                                    contract.isTourismFeeIncluded === true
                                                        ? "price includes mandatory tourism fees."
                                                        : "price excludes mandatory tourism fees and is payable directly at the hotel.",
                                                ];
                                            } else if (
                                                roomPerDay?.rooms[objIndex]?.rates[basePlanIndex]
                                                    ?.priority === contract?.priority
                                            ) {
                                                roomPerDay?.rooms[objIndex]?.rates?.push({
                                                    rateKey: `TCTT|${fromDate}|${toDate}|${hotelId}|${
                                                        roomType?._id
                                                    }|${
                                                        boardTypesWithKeyVal[contract?.basePlan]
                                                            ?.boardShortName
                                                    }|${
                                                        boardTypesWithKeyVal[
                                                            mealSupplements[ab]?.boardType
                                                        ]?.boardShortName
                                                    }|`,
                                                    rateName: `${roomType?.roomName} with ${
                                                        boardTypesWithKeyVal[
                                                            mealSupplements[ab]?.boardType
                                                        ]?.boardName
                                                    }`,
                                                    boardName:
                                                        boardTypesWithKeyVal[
                                                            mealSupplements[ab]?.boardType
                                                        ]?.boardName,
                                                    boardCode:
                                                        boardTypesWithKeyVal[
                                                            mealSupplements[ab]?.boardType
                                                        ]?.boardShortName,
                                                    contractGroup: contract?.contractGroup?._id,
                                                    contract: contract?._id,
                                                    isSpecialRate: contract?.isSpecialRate,
                                                    appliedRateCode:
                                                        contract?.roomRates[0].rateCode,
                                                    applyPromotion: contract?.applyPromotion,
                                                    basePlan: contract?.basePlan,
                                                    priority: contract?.priority,
                                                    selectedRoomOccupancies,
                                                    mealSupplement: {
                                                        _id: mealSupplements[ab]?.boardType,
                                                        mealSupplementName:
                                                            boardTypesWithKeyVal[
                                                                mealSupplements[ab]?.boardType
                                                            ]?.boardName,
                                                        mealSupplementShortName:
                                                            boardTypesWithKeyVal[
                                                                mealSupplements[ab]?.boardType
                                                            ]?.boardShortName,
                                                    },
                                                    mealSupplementPrice,
                                                    roomPrice,
                                                    netPrice:
                                                        roomPrice +
                                                        mealSupplementPrice +
                                                        totalAddOnPrice +
                                                        extraBedSupplementPrice +
                                                        childSupplementPrice,
                                                    extraBedSupplementPrice,
                                                    childSupplementPrice,
                                                    mandatoryAddOns: sortedAddOns,
                                                    mandatoryAddOnPrice,
                                                    totalAddOnPrice,
                                                    allocationType: allocation?.allocationType,
                                                    availableAllocation,
                                                    isContractedRate,
                                                    cancellationPolicies:
                                                        filteredCancellationPolicies,
                                                    isTourismFeeIncluded:
                                                        contract.isTourismFeeIncluded,
                                                    rateComments: [
                                                        contract.isTourismFeeIncluded === true
                                                            ? "price includes mandatory tourism fees."
                                                            : "price excludes mandatory tourism fees and is payable directly at the hotel.",
                                                    ],
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return roomPerDay;
    } catch (err) {
        console.log("single day", err);
        throw err;
    }
};

const combineMultipleDayHotelPricesSG = (promiseResponse) => {
    try {
        let resultRooms = [];
        for (let i = 0; i < promiseResponse[0].rooms?.length; i++) {
            const firstDate = promiseResponse[0]?.date;
            let obj = promiseResponse[0].rooms[i];
            let matched = true;

            // initializing contracts array on first object and putting date, and contract to it
            for (let j = 0; j < obj.rates.length; j++) {
                obj.rates[j].grossPrice = obj.rates[j].netPrice;
                obj.rates[j].addOnSupplementPrice = 0;
                obj.rates[j].addOnSupplements = [];
                obj.rates[j].contracts = [
                    {
                        date: firstDate,
                        contractGroup: obj.rates[j].contractGroup,
                        contract: obj.rates[j].contract,
                        mealSupplementPrice: obj.rates[j].mealSupplementPrice,
                        extraBedSupplementPrice: obj.rates[j].extraBedSupplementPrice,
                        childSupplementPrice: obj.rates[j].childSupplementPrice,
                        roomPrice: obj.rates[j].roomPrice,
                        netPrice: obj.rates[j]?.netPrice,
                        selectedRoomOccupancies:
                            JSON.parse(JSON.stringify(obj.rates[j]))?.selectedRoomOccupancies || [],
                        isSpecialRate: obj.rates[j]?.isSpecialRate,
                        appliedRateCode: obj.rates[j]?.appliedRateCode,
                        applyPromotion: obj.rates[j]?.applyPromotion,
                        isContractedRate: obj.rates[j]?.isContractedRate,
                    },
                ];
            }

            for (let j = 1; j < promiseResponse.length; j++) {
                let found = false;
                const promiseRes = promiseResponse[j];

                for (let k = 0; k < promiseRes.rooms.length; k++) {
                    if (
                        promiseRes?.rooms[k]?.roomTypeId?.toString() === obj?.roomTypeId?.toString()
                    ) {
                        for (let l = 0; l < obj?.rates?.length; l++) {
                            const myRate = obj?.rates[l];
                            let rateFound = false;

                            for (let m = 0; m < promiseRes?.rooms[k]?.rates?.length; m++) {
                                // matching each days base plans with another days baseplans
                                // there is different combinations with baseplan and mealSupplement
                                // myRate?.basePlan?.toString() ===
                                // promiseRes?.rooms[k]?.rates[m]?.basePlan?.toString() &&
                                // myRate?.boardCode ===
                                // promiseRes?.rooms[k]?.rates[m]?.boardCode?.toString()
                                // check this working or not
                                if (
                                    myRate?.basePlan?.toString() ===
                                        promiseRes?.rooms[k]?.rates[m]?.basePlan?.toString() &&
                                    myRate?.mealSupplement?._id?.toString() ===
                                        promiseRes?.rooms[k]?.rates[
                                            m
                                        ]?.mealSupplement?._id?.toString()
                                ) {
                                    let occupancyMatch = true;
                                    for (
                                        let oc1 = 0;
                                        oc1 < myRate?.selectedRoomOccupancies?.length;
                                        oc1++
                                    ) {
                                        if (
                                            myRate?.selectedRoomOccupancies[oc1].roomKey ===
                                                promiseRes?.rooms[k]?.rates[m]
                                                    ?.selectedRoomOccupancies[oc1]?.roomKey &&
                                            myRate?.selectedRoomOccupancies[oc1]?.shortName ===
                                                promiseRes?.rooms[k]?.rates[m]
                                                    ?.selectedRoomOccupancies[oc1]?.shortName &&
                                            myRate?.selectedRoomOccupancies[oc1]
                                                ?.extraBedApplied ===
                                                promiseRes?.rooms[k]?.rates[m]
                                                    ?.selectedRoomOccupancies[oc1]
                                                    ?.extraBedApplied &&
                                            myRate?.selectedRoomOccupancies[oc1]?.rollBedApplied ===
                                                promiseRes?.rooms[k]?.rates[m]
                                                    ?.selectedRoomOccupancies[oc1]?.rollBedApplied
                                        ) {
                                            myRate.selectedRoomOccupancies[oc1].price +=
                                                promiseRes?.rooms[k]?.rates[
                                                    m
                                                ]?.selectedRoomOccupancies[oc1]?.price;
                                        } else {
                                            occupancyMatch = false;
                                        }
                                    }
                                    // combining multiple days prices to a single field
                                    if (occupancyMatch === true) {
                                        myRate.mealSupplementPrice +=
                                            promiseRes?.rooms[k]?.rates[m]?.mealSupplementPrice;
                                        myRate.extraBedSupplementPrice +=
                                            promiseRes?.rooms[k]?.rates[m]?.extraBedSupplementPrice;
                                        myRate.childSupplementPrice +=
                                            promiseRes?.rooms[k]?.rates[m]?.childSupplementPrice;
                                        myRate.roomPrice +=
                                            promiseRes?.rooms[k]?.rates[m]?.roomPrice;
                                        myRate.netPrice += promiseRes?.rooms[k]?.rates[m]?.netPrice;
                                        myRate.grossPrice +=
                                            promiseRes?.rooms[k]?.rates[m]?.netPrice;

                                        // allocation
                                        if (
                                            myRate.allocationType === "stop-sale" ||
                                            promiseRes?.rooms[k]?.rates[m]?.allocationType ===
                                                "stop-sale"
                                        ) {
                                            myRate.allocationType = "stop-sale";
                                            myRate.availableAllocation = 0;
                                        } else if (
                                            myRate.availableAllocation >
                                            promiseRes?.rooms[k]?.rates[m]?.availableAllocation
                                        ) {
                                            myRate.availableAllocation =
                                                promiseRes?.rooms[k]?.rates[m]?.availableAllocation;
                                        }

                                        // add on
                                        myRate.mandatoryAddOnPrice +=
                                            promiseRes?.rooms[k]?.rates[m]?.mandatoryAddOnPrice;
                                        myRate.totalAddOnPrice +=
                                            promiseRes?.rooms[k]?.rates[m]?.totalAddOnPrice;

                                        let myAddOns = [...myRate?.mandatoryAddOns];
                                        for (
                                            let ao = 0;
                                            ao <
                                            promiseRes?.rooms[k]?.rates[m]?.mandatoryAddOns?.length;
                                            ao++
                                        ) {
                                            // console.log(promiseRes?.rooms[k]?.rates[m]?.addOns);
                                            const addOnObjIndex = myAddOns?.findIndex((item) => {
                                                return (
                                                    item?.addOnId?.toString() ===
                                                    promiseRes?.rooms[k]?.rates[m]?.mandatoryAddOns[
                                                        ao
                                                    ]?.addOnId?.toString()
                                                );
                                            });

                                            // console.log(addOnObjIndex);
                                            // console.log(hi);
                                            if (addOnObjIndex !== -1) {
                                                myAddOns[addOnObjIndex] = {
                                                    ...myAddOns[addOnObjIndex],
                                                    dates: [
                                                        ...myAddOns[addOnObjIndex].dates,
                                                        promiseRes?.rooms[k]?.rates[m]
                                                            ?.mandatoryAddOns[ao]?.dates[0],
                                                    ],
                                                };
                                            } else {
                                                myAddOns = [
                                                    ...myAddOns,
                                                    promiseRes?.rooms[k]?.rates[m]?.mandatoryAddOns[
                                                        ao
                                                    ],
                                                ];
                                            }
                                        }

                                        obj.rates[l].mandatoryAddOns = myAddOns;

                                        // pushing single days contracts to an array
                                        // each array contains date and contract field
                                        myRate.contracts.push({
                                            date: promiseRes?.date,
                                            contractGroup:
                                                promiseRes?.rooms[k]?.rates[m]?.contractGroup,
                                            contract: promiseRes?.rooms[k]?.rates[m]?.contract,
                                            mealSupplementPrice:
                                                promiseRes?.rooms[k]?.rates[m]?.mealSupplementPrice,
                                            extraBedSupplementPrice:
                                                promiseRes?.rooms[k]?.rates[m]
                                                    ?.extraBedSupplementPrice,
                                            childSupplementPrice:
                                                promiseRes?.rooms[k]?.rates[m]
                                                    ?.childSupplementPrice,
                                            roomPrice: promiseRes?.rooms[k]?.rates[m]?.roomPrice,
                                            netPrice: promiseRes?.rooms[k]?.rates[m]?.netPrice,
                                            selectedRoomOccupancies:
                                                promiseRes?.rooms[k]?.rates[m]
                                                    ?.selectedRoomOccupancies,
                                            isSpecialRate:
                                                promiseRes?.rooms[k]?.rates[m]?.isSpecialRate,
                                            appliedRateCode:
                                                promiseRes?.rooms[k]?.rates[m]?.appliedRateCode,
                                            applyPromotion:
                                                promiseRes?.rooms[k]?.rates[m]?.applyPromotion,
                                            isContractedRate:
                                                promiseRes?.rooms[k]?.rates[m]?.isContractedRate,
                                        });

                                        rateFound = true;
                                        break;
                                    }
                                }
                            }
                            if (rateFound === false) {
                                obj.rates[l] = null;
                            }
                        }
                        obj.rates = obj.rates?.filter((item) => item !== null);
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    matched = false;
                    break;
                }
            }

            if (matched) {
                let filteredObjRates = [];
                obj?.rates?.map((item) => {
                    let objIndex = filteredObjRates?.findIndex((filItem) => {
                        return item?.boardCode === filItem?.boardCode;
                    });
                    if (objIndex !== -1) {
                        if (filteredObjRates[objIndex]?.netPrice > item?.netPrice) {
                            filteredObjRates[objIndex] = item;
                        }
                    } else {
                        filteredObjRates.push(item);
                    }
                });
                resultRooms.push({
                    ...obj,
                    rates: filteredObjRates?.sort((a, b) => a?.netPrice - b?.netPrice),
                });
                // resultRooms.push(obj)
            }
        }

        return resultRooms;
    } catch (err) {
        console.log("combine", err);
        throw err;
    }
};

const addPromotionOnHotelPricesSG = async ({
    data,
    bookBefore,
    roomTypesWithKeyVal,
    boardTypesWithKeyVal,
    fromDate,
    hotel,
    allPromotions,
}) => {
    try {
        const hotelId = hotel?._id;
        let availabilityData = data;

        for (let i = 0; i < availabilityData.length; i++) {
            const roomType = availabilityData[i]?.roomType?._id;

            // let clientMarkup = clientMarkups?.find((item) => {
            //     return item?.roomTypeId?.toString() === roomType?.toString();
            // });
            // if (!clientMarkup) {
            //     clientMarkup = clientStarCategoryMarkups?.find((item) => {
            //         return item?.name === hotel?.starCategory;
            //     });
            // }
            // let subAgentMarkup;
            // if (reseller?.role === "sub-agent") {
            //     subAgentMarkup = subAgentMarkups?.find((item) => {
            //         return item?.roomTypeId?.toString() === roomType?.toString();
            //     });
            //     if (!subAgentMarkup) {
            //         subAgentMarkup = subAgentStarCategoryMarkups?.find((item) => {
            //             return item?.name === hotel?.starCategory;
            //         });
            //     }
            // }

            for (let j = 0; j < availabilityData[i].rates?.length; j++) {
                const contractGroups = [];
                const basePlan = availabilityData[i].rates[j];
                // sorting multiple contracts of each base plan to single contracts array and
                // counting continues number Of nights in each contract.

                for (let k = 0; k < basePlan.contracts.length; k++) {
                    const objIndex = contractGroups?.findIndex((contract) => {
                        return (
                            contract?.contractGroup?.toString() ===
                            basePlan.contracts[k].contractGroup?.toString()
                        );
                    });
                    if (
                        basePlan.contracts[k]?.applyPromotion === true &&
                        basePlan.contracts[k]?.isContractedRate === false
                    ) {
                        if (objIndex === -1) {
                            contractGroups.push({
                                contractGroup: basePlan.contracts[k].contractGroup,
                                dates: [
                                    {
                                        date: basePlan.contracts[k].date,
                                        contract: basePlan.contracts[k].contract,
                                        isSpecialRate: basePlan.contracts[k].isSpecialRate,
                                        selectedRoomOccupancies:
                                            basePlan.contracts[k]?.selectedRoomOccupancies || [],
                                    },
                                ],
                                noOfNights: 1,
                                // promotion: {},
                            });
                        } else {
                            contractGroups[objIndex].dates.push({
                                date: basePlan.contracts[k].date,
                                contract: basePlan.contracts[k].contract,
                                isSpecialRate: basePlan.contracts[k].isSpecialRate,
                                selectedRoomOccupancies:
                                    basePlan.contracts[k]?.selectedRoomOccupancies,
                            });
                            contractGroups[objIndex].noOfNights += 1;
                        }
                    }
                }

                let cancellationPolicies = basePlan?.cancellationPolicies;

                const appliedPromotionIds = {};
                // create a loop that check one and
                for (let l = 0; l < contractGroups.length; l++) {
                    // const promotionFilters = {
                    //     hotel: hotelId,
                    //     contractGroups: contractGroups[l]?.contractGroup,
                    //     bookingWindowFrom: { $lte: new Date(new Date().setHours(0, 0, 0, 0)) },
                    //     bookingWindowTo: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                    //     isDeleted: false,
                    //     $or: [
                    //         {
                    //             specificNations: true,
                    //             applicableNations: nationality?.toUpperCase(),
                    //             "applicableNations.0": { $exists: true },
                    //         },
                    //         { specificNations: false },
                    //     ],
                    // };

                    const promotions = allPromotions?.filter((item) => {
                        return (
                            item?.hotel?.toString() === hotelId?.toString() &&
                            item?.contractGroups?.some(
                                (contGroup) =>
                                    contGroup?.toString() ===
                                    contractGroups[l]?.contractGroup?.toString()
                            ) &&
                            new Date(item?.bookingWindowFrom) <=
                                new Date(new Date().setHours(0, 0, 0, 0)) &&
                            new Date(item?.bookingWindowTo) >=
                                new Date(new Date().setHours(0, 0, 0, 0))
                        );
                    });
                    // const promotions = await HotelPromotion.find(promotionFilters)
                    //     .populate({
                    //         path: "combinedPromotions",
                    //         options: { sort: { priority: -1 } },
                    //     })
                    //     .sort({ priority: -1 })
                    //     .lean();

                    // run with each promotion and compare prize and append added promotion with contracts
                    const {
                        promotion,
                        appliedStayPays,
                        appliedMealUpgrades,
                        appliedRoomTypeUpgrades,
                        appliedPromotions,
                        stayPayOffer,
                        discountOffer,
                        appliedDiscounts,
                        totalOffer,
                    } = applyPromotion({
                        promotions,
                        selectedContract: contractGroups[l],
                        roomType,
                        bookBefore,
                        basePlan,
                        roomTypesWithKeyVal,
                        boardTypesWithKeyVal,
                        isFirstIteration: l === 0,
                    });

                    // updating cancellation policies
                    if (contractGroups[l].dates?.includes(fromDate) && promotion) {
                        if (promotion?.cancellationPolicies?.length > 0) {
                            const filteredCancellationPolicies =
                                promotion?.cancellationPolicies?.filter((item) => {
                                    return (
                                        new Date(item?.fromDate) <= new Date(fromDate) &&
                                        new Date(item?.toDate) >= new Date(fromDate) &&
                                        item?.roomTypes?.some(
                                            (item) => item?.toString() === roomType?.toString()
                                        )
                                    );
                                });

                            if (filteredCancellationPolicies?.length > 0) {
                                cancellationPolicies = filteredCancellationPolicies;
                            }
                        }
                    }

                    // appliedPromotionIds[contractGroups[l]?.contractGroup?.toString()] =
                    //     promotion?._id;

                    if (availabilityData[i].rates[j].netPrice - totalOffer < 0) {
                        availabilityData[i].rates[j].netPrice = 0;
                    } else {
                        availabilityData[i].rates[j].netPrice -= totalOffer;
                    }

                    // if (availabilityData[i].rates[j].stayPayOffer) {
                    //     availabilityData[i].rates[j].stayPayOffer += stayPayOffer;
                    // } else {
                    //     availabilityData[i].rates[j].stayPayOffer = stayPayOffer;
                    // }
                    // if (availabilityData[i].rates[j].discountOffer) {
                    //     availabilityData[i].rates[j].discountOffer += discountOffer;
                    // } else {
                    //     availabilityData[i].rates[j].discountOffer = discountOffer;
                    // }
                    if (availabilityData[i].rates[j].totalOffer) {
                        availabilityData[i].rates[j].totalOffer += totalOffer;
                    } else {
                        availabilityData[i].rates[j].totalOffer = totalOffer;
                    }
                    if (availabilityData[i].rates[j].promotions) {
                        availabilityData[i].rates[j].promotions?.push(...appliedPromotions);
                    } else {
                        availabilityData[i].rates[j].promotions = appliedPromotions;
                    }
                    // if (availabilityData[i].rates[j].appliedDiscounts) {
                    //     availabilityData[i].rates[j].appliedDiscounts?.push(...appliedDiscounts);
                    // } else {
                    //     availabilityData[i].rates[j].appliedDiscounts = appliedDiscounts;
                    // }
                    // if (availabilityData[i].rates[j].appliedStayPays) {
                    //     availabilityData[i].rates[j].appliedStayPays?.push(...appliedStayPays);
                    // } else {
                    //     availabilityData[i].rates[j].appliedStayPays = appliedStayPays;
                    // }
                    // if (availabilityData[i].rates[j].appliedMealUpgrades) {
                    //     availabilityData[i].rates[j].appliedMealUpgrades?.push(
                    //         ...appliedMealUpgrades
                    //     );
                    // } else {
                    //     availabilityData[i].rates[j].appliedMealUpgrades = appliedMealUpgrades;
                    // }
                    // if (availabilityData[i].rates[j].appliedRoomTypeUpgrades) {
                    //     availabilityData[i].rates[j].appliedRoomTypeUpgrades?.push(
                    //         ...appliedRoomTypeUpgrades
                    //     );
                    // } else {
                    //     availabilityData[i].rates[j].appliedRoomTypeUpgrades =
                    //         appliedRoomTypeUpgrades;
                    // }
                }

                let currentNetPrice = basePlan.netPrice;
                // let adminMarketMarkup = 0;
                // if (marketMarkup && !isNaN(marketMarkup.markup)) {
                //     if (marketMarkup.markupType === "flat") {
                //         adminMarketMarkup = marketMarkup.markup * basePlan?.contracts?.length; // multiplying to noof nights
                //     } else {
                //         adminMarketMarkup = (currentNetPrice / 100) * marketMarkup.markup;
                //     }
                // }
                // currentNetPrice += adminMarketMarkup;

                // let adminB2bMarkup = 0;
                // if (b2bMarkup && !isNaN(b2bMarkup.markup)) {
                //     if (b2bMarkup.markupType === "flat") {
                //         adminB2bMarkup = b2bMarkup.markup * basePlan?.contracts?.length; // multiplying to noof nights
                //     } else {
                //         adminB2bMarkup = (currentNetPrice / 100) * b2bMarkup.markup;
                //     }
                // }
                // currentNetPrice += adminB2bMarkup;

                // // agent to sub agent markup
                // let saMarkup = 0;
                // if (subAgentMarkup && !isNaN(subAgentMarkup.markup)) {
                //     if (subAgentMarkup.markupType === "flat") {
                //         saMarkup = subAgentMarkup.markup * basePlan?.contracts?.length; // multiplying to noof nights
                //     } else {
                //         saMarkup = (currentNetPrice / 100) * subAgentMarkup.markup;
                //     }
                // }
                // currentNetPrice += saMarkup;

                // // agent to clinet markup
                // let clMarkup = 0;
                // if (clientMarkup && !isNaN(clientMarkup.markup)) {
                //     if (clientMarkup.markupType === "flat") {
                //         clMarkup = clientMarkup.markup * basePlan?.contracts?.length; // multiplying to noof nights
                //     } else {
                //         clMarkup = (currentNetPrice / 100) * clientMarkup.markup;
                //     }
                // }
                // currentNetPrice += clMarkup;

                availabilityData[i].rates[j].netPrice = currentNetPrice;
                availabilityData[i].rates[j].grossPrice += 0;
                // adminMarketMarkup + adminB2bMarkup + saMarkup + clMarkup;

                let cancellationType = "Non Refundable";
                let allCancellationTypes = [];
                let cancellationPoliciesTxt = [];
                let cancellationPoliciesList = [];
                let payLaterAvailable = false;
                let lastDateForPayment;

                if (cancellationPolicies?.length < 1) {
                    cancellationType = "Non Refundable";
                } else {
                    const sortedCancellationPolicies = cancellationPolicies?.sort((a, b) => {
                        return b.daysBefore - a.daysBefore;
                    });
                    for (let cp = 0; cp < sortedCancellationPolicies?.length; cp++) {
                        let policy = sortedCancellationPolicies[cp];
                        let dateBy =
                            new Date(
                                new Date(fromDate).setDate(
                                    new Date(fromDate).getDate() - policy?.daysBefore
                                )
                            ) < new Date()
                                ? new Date()
                                : new Date(fromDate).setDate(
                                      new Date(fromDate).getDate() - policy?.daysBefore
                                  );
                        let formatedDateBy = formatDate(dateBy);

                        if (
                            cp === 0 &&
                            (dateBy > new Date() || policy?.cancellationCharge === 0) &&
                            policy?.requestCancelDaysBefore
                        ) {
                            payLaterAvailable = true;
                            const requestDaysBefore =
                                new Date(
                                    new Date(fromDate).setDate(
                                        new Date(fromDate).getDate() -
                                            policy?.requestCancelDaysBefore
                                    )
                                ) < new Date()
                                    ? new Date()
                                    : new Date(fromDate).setDate(
                                          new Date(fromDate).getDate() -
                                              policy?.requestCancelDaysBefore
                                      );
                            lastDateForPayment = new Date(requestDaysBefore);
                        }

                        if (
                            policy?.cancellationType === "non-refundable" ||
                            policy?.cancellationChargeType === "non-refundable" // we can remove this line later
                        ) {
                            allCancellationTypes = [];
                            cancellationPoliciesTxt = [];
                            payLaterAvailable = false;
                            lastDateForPayment = null;
                            break;
                        } else if (policy?.cancellationCharge === 0) {
                            allCancellationTypes.push("refundable");
                            cancellationPoliciesTxt.push(
                                `Full refund if you cancel this on / after ${formatedDateBy}.`
                            );
                            cancellationPoliciesList.push({
                                from: new Date(dateBy),
                                amount: 0,
                            });
                        } else if (policy?.cancellationChargeType === "percentage") {
                            if (policy?.cancellationCharge === 100) {
                                allCancellationTypes.push("non-refundable");
                            } else {
                                allCancellationTypes.push("partially-refundable");
                            }
                            let cancellationCharge =
                                (currentNetPrice / 100) * policy?.cancellationCharge;
                            cancellationPoliciesTxt.push(
                                `If you cancel this booking on / after ${formatedDateBy} you will be charged ${cancellationCharge?.toFixed(
                                    2
                                )} AED.`
                            );
                            cancellationPoliciesList.push({
                                from: new Date(dateBy),
                                amount: cancellationCharge,
                            });
                        } else if (policy?.cancellationChargeType === "night") {
                            allCancellationTypes.push("partially-refundable");
                            let cancellationCharge = basePlan.contracts[0]?.netPrice;
                            cancellationPoliciesTxt.push(
                                `If you cancel this booking on / after ${formatedDateBy} you will be charged ${cancellationCharge?.toFixed(
                                    2
                                )} AED.`
                            );
                            cancellationPoliciesList.push({
                                from: new Date(dateBy),
                                amount: cancellationCharge,
                            });
                        } else if (policy?.cancellationChargeType === "flat") {
                            allCancellationTypes.push("partially-refundable");
                            cancellationPoliciesTxt.push(
                                `If you cancel this booking on / after ${formatedDateBy} you will be charged ${policy?.cancellationCharge} AED.`
                            );
                            cancellationPoliciesList.push({
                                from: new Date(dateBy),
                                amount: policy?.cancellationCharge,
                            });
                        }
                    }

                    if (
                        allCancellationTypes?.length < 1 ||
                        allCancellationTypes?.every((item) => item === "non-refundable")
                    ) {
                        cancellationType = "Non Refundable";
                    } else if (allCancellationTypes?.every((item) => item === "refundable")) {
                        cancellationType = "Refundable";
                    } else {
                        cancellationType = "Partially Refundable";
                    }
                }

                console.log("payLaterAvailable", payLaterAvailable);
                console.log("lastDateForPayment", lastDateForPayment);
                console.log("cancellationPoliciesList", cancellationPoliciesList);

                let contractsWithDate = {};
                basePlan.contracts?.map((item) => {
                    contractsWithDate[item?.date] = item?.contract;
                });

                // TODO
                // optimize above code and take only required items
                basePlan.rateKey += `${
                    basePlan?.addOnSupplements?.length > 0
                        ? basePlan?.addOnSupplements?.join("-")
                        : ""
                }|${JSON.stringify(contractsWithDate)}|${JSON.stringify(appliedPromotionIds)}|`;

                delete basePlan.contract;
                delete basePlan.basePlan;
                delete basePlan.priority;
                delete basePlan.mealSupplement;
                delete basePlan.mealSupplementPrice;
                delete basePlan.extraBedSupplementPrice;
                delete basePlan.childSupplementPrice;
                delete basePlan.mandatoryAddOns;
                delete basePlan.mandatoryAddOnPrice;
                delete basePlan.totalAddOnPrice;
                delete basePlan.allocationType;
                delete basePlan.contracts;
                delete basePlan.addOnSupplementPrice;
                delete basePlan.addOnSupplements;

                availabilityData[i].rates[j].cancellationType = cancellationType;
                availabilityData[i].rates[j].cancellationPolicies = cancellationPoliciesTxt;
                // availabilityData[i].rates[j].cancellationPoliciesTxt = cancellationPoliciesTxt;
                // availabilityData[i].rates[j].cancellationPolicies = cancellationPoliciesList;
                availabilityData[i].rates[j].isApiConnected = false;
                availabilityData[i].rates[j].payLaterAvailable = payLaterAvailable;
                availabilityData[i].rates[j].lastDateForPayment = lastDateForPayment;
            }
        }

        return availabilityData;
    } catch (err) {
        console.log("addon", err);
        throw err;
    }
};

const createCombinationWithAddOn = async ({
    resultRooms,
    hotelId,
    fromDate,
    toDate,
    totalAdults,
    totalChildren,
    roomsCount,
    noOfNights,
    allAddOns,
}) => {
    try {
        const addOns = allAddOns?.filter((addOn) => {
            return (
                addOn?.hotel?.toString() === hotelId?.toString() &&
                addOn?.isMandatory === false &&
                new Date(addOn?.fromDate) <= new Date(fromDate) &&
                new Date(addOn?.toDate) >= new Date(toDate)
            );
        });
        // const addOns = await HotelAddOn.find({
        //     hotel: hotelId,
        //     fromDate: { $lte: new Date(fromDate) },
        //     toDate: { $gte: new Date(toDate) },
        //     isMandatory: false,
        //     isDeleted: false,
        // }).lean();

        // TODO
        // create combination with two or more extra addons
        for (let i = 0; i < resultRooms?.length; i++) {
            const newRates = [];
            for (let j = 0; j < resultRooms[i]?.rates?.length; j++) {
                const myRate = resultRooms[i]?.rates[j];

                const mandAddOns = myRate?.mandatoryAddOns;
                const addOnsTxt = [];
                for (let k = 0; k < mandAddOns?.length; k++) {
                    addOnsTxt.push(
                        `${mandAddOns[k]?.dates?.length} nights ${mandAddOns[k]?.addOnName} added`
                    );
                }
                myRate.addOnsTxt = addOnsTxt;
                newRates.push(myRate);

                for (let k = 0; k < addOns?.length; k++) {
                    if (
                        !addOns[k]?.roomTypes?.some(
                            (item) => item?.toString() === resultRooms[i]?.roomTypeId?.toString()
                        ) ||
                        !addOns[k]?.boardTypes?.some(
                            (item) => item?.toString() === myRate?.basePlan?.toString()
                        )
                    ) {
                        continue;
                    }

                    let totalAddOnPrice = 0;
                    if (addOns[k]?.applyOn === "pax") {
                        let adultAddOnPrice = addOns[k]?.adultPrice * totalAdults * noOfNights;
                        let childAddOnPrice = addOns[k]?.childPrice * totalChildren * noOfNights;
                        totalAddOnPrice = adultAddOnPrice + childAddOnPrice;
                    } else if (addOns[k]?.applyOn === "room") {
                        totalAddOnPrice = addOns[k]?.roomPrice * roomsCount * noOfNights;
                    } else {
                        throw new Error("something went wrong on supplement addons");
                    }

                    const newRate = {
                        ...myRate,
                        addOnSupplementPrice: totalAddOnPrice,
                        addOnSupplements: [addOns[k]?._id],
                        totalAddOnPrice: myRate?.totalAddOnPrice + totalAddOnPrice,
                        netPrice: myRate?.netPrice + totalAddOnPrice,
                        grossPrice: myRate?.grossPrice + totalAddOnPrice,
                        addOnsTxt: [...myRate?.addOnsTxt, `all days ${addOns[k].addOnName} added`],
                    };
                    newRates.push(newRate);
                }
            }
            resultRooms[i].rates = newRates;
        }

        return resultRooms;
    } catch (err) {
        console.log("comb addon", err);
        throw err;
    }
};

const getSingleHotelAvailability = async ({
    dates,
    rooms,
    hotel,
    noOfNights,
    totalAdults,
    totalChildren,
    fromDate,
    toDate,
    bookBefore,
    reseller,
    marketStrategy,
    profileMarkup,
    clientMarkups,
    clientStarCategoryMarkups,
    subAgentMarkups,
    subAgentStarCategoryMarkups,
    nationality,
    roomTypes,
    boardTypes,
    allContracts,
    allAddOns,
    allPromotions,
    allAllocations,
}) => {
    try {
        let roomTypesWithKeyVal = {};
        let boardTypesWithKeyVal = {};

        roomTypes
            ?.filter((rmType) => {
                return rmType?.hotel?.toString() === hotel?._id?.toString();
            })
            ?.forEach((rmType) => {
                roomTypesWithKeyVal[rmType?._id] = rmType;
            });

        boardTypes
            ?.filter((brType) => {
                return hotel?.boardTypes?.some(
                    (item) => item?._id?.toString() === brType?._id?.toString()
                );
            })
            ?.forEach((brType) => {
                boardTypesWithKeyVal[brType?._id] = brType;
            });

        const promises = [];
        for (let i = 0; i < dates.length - 1; i++) {
            response = getSingleDayAvailabilitySG({
                date: dates[i],
                rooms,
                hotel,
                noOfNights,
                totalAdults,
                totalChildren,
                roomsCount: rooms?.length,
                roomTypesWithKeyVal,
                boardTypesWithKeyVal,
                fromDate,
                toDate,
                allContracts,
                allAddOns,
                allAllocations,
            });
            promises.push(response);
        }

        const promiseResponse = await Promise.all([...promises]);

        const resultRooms = combineMultipleDayHotelPricesSG(promiseResponse);

        const addOnresponse = await createCombinationWithAddOn({
            resultRooms,
            hotelId: hotel?._id,
            fromDate,
            toDate,
            totalAdults,
            totalChildren,
            roomsCount: rooms?.length,
            noOfNights,
        });

        // adding promotions on hotel prices
        const promotionAppliedData = await addPromotionOnHotelPricesSG({
            data: addOnresponse,
            bookBefore,
            roomTypesWithKeyVal,
            boardTypesWithKeyVal,
            fromDate,
            hotel,
            nationality,
            allPromotions,
        });

        let minRate = 0;
        let maxRate = 0;
        let totalOffer = 0;
        for (let i = 0; i < promotionAppliedData?.length; i++) {
            for (let j = 0; j < promotionAppliedData[i]?.rates?.length; j++) {
                if (i === 0 && j === 0) {
                    minRate = promotionAppliedData[i]?.rates[j]?.netPrice;
                    maxRate = promotionAppliedData[i]?.rates[j]?.netPrice;
                    totalOffer = promotionAppliedData[i]?.rates[j]?.totalOffer || 0;
                } else if (minRate > promotionAppliedData[i]?.rates[j]?.netPrice) {
                    minRate = promotionAppliedData[i]?.rates[j]?.netPrice;
                    totalOffer = promotionAppliedData[i]?.rates[j]?.totalOffer || 0;
                } else if (maxRate < promotionAppliedData[i]?.rates[j]?.netPrice) {
                    maxRate = promotionAppliedData[i]?.rates[j]?.netPrice;
                }
            }
        }

        return { hotel, rooms: promotionAppliedData, minRate, maxRate, totalOffer, noOfNights };
    } catch (err) {
        console.log("availability", err);
        throw err;
    }
};

module.exports = {
    getSingleHotelAvailability,
};
