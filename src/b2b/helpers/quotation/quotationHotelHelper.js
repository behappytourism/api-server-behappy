const { isValidObjectId, Types } = require("mongoose");
const moment = require("moment");

const {
    Hotel,
    RoomType,
    HotelBoardType,
    HotelPromotion,
    HotelContract,
    HotelAddOn,
    HotelAllocation,
} = require("../../../models/hotel");
const { getDates, getDayName } = require("../../../utils");

const allOccupancies = ["SGL", "DBL", "TPL", "CWB", "CNB"];

const tourismDirhamFees = {
    2: 10,
    3: 10,
    4: 15,
    5: 20,
    7: 20,
    apartment: 0,
};

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
        const hotelId = hotel?._id;
        const roomPerDay = { date, rooms: [] };
        const day = getDayName(date);

        if (!hotel?.openDays?.includes(day)) {
            return roomPerDay;
        }

        const contracts = allContracts?.filter((item) => {
            return (
                item?.hotel?.toString() === hotelId?.toString() &&
                new Date(item?.sellFrom) <= new Date(date) &&
                new Date(item?.sellTo) >= new Date(date)
            );
        });

        // const contracts = await HotelContract.find({
        //     hotel: hotelId,
        //     sellFrom: { $lte: new Date(date) },
        //     sellTo: { $gte: new Date(date) },
        //     isDeleted: false,
        //     status: "approved",
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
                    // });

                    if (allocation?.allocationType === "stop-sale") {
                        continue;
                    }

                    let extrabedAppliedChildren = 0;
                    let extrabedAppliedInfants = 0;
                    let selectedRoomOccupancies = [];
                    let roomPrice = 0;
                    let extraBedSupplementPrice = 0;
                    let childSupplementPrice = 0;

                    const filteredRoomOccupancies = roomType?.roomOccupancies?.filter((item) => {
                        return item?.isActive === true;
                    });

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

                                    let extraBedApplied = false;
                                    let rollBedApplied = false;
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
                                            contract?.childPolicies.filter((item) => {
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

                                        if (rateOccupancyIndex === -1) {
                                            continue;
                                        }

                                        let tempRoomPrice;
                                        rooomRates?.forEach((rmRate) => {
                                            if (
                                                rmRate?.roomTypes[j]?.roomOccupancies[
                                                    rateOccupancyIndex
                                                ]?.price &&
                                                (!tempRoomPrice ||
                                                    rmRate?.roomTypes[j]?.roomOccupancies[
                                                        rateOccupancyIndex
                                                    ]?.price < tempRoomPrice)
                                            ) {
                                                tempRoomPrice =
                                                    rmRate?.roomTypes[j]?.roomOccupancies[
                                                        rateOccupancyIndex
                                                    ]?.price;
                                            }
                                        });

                                        if (!tempRoomPrice) {
                                            continue;
                                        }

                                        roomPrice += tempRoomPrice;
                                        extraBedSupplementPrice += tempExBedSupplementPrice;
                                        childSupplementPrice += tempChdSupplementPrice;

                                        selectedRoomOccupancies.push({
                                            occupancyId: roomOccupancy?._id,
                                            occupancyName:
                                                extraBedApplied === true &&
                                                roomOccupancy?.displayName
                                                    ? roomOccupancy?.displayName
                                                    : roomOccupancy?.occupancyName,
                                            shortName: roomOccupancy?.shortName,
                                            count: 1,
                                            price: tempRoomPrice,
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
                                            // allocationType: allocation?.allocationType,
                                            // availableAllocation,
                                            cancellationPolicies: filteredCancellationPolicies,
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
                                        // allocationType: allocation?.allocationType,
                                        // availableAllocation,
                                        cancellationPolicies: filteredCancellationPolicies,
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
                                        ].contractGroup = contract?.contractGroup?._id;
                                        roomPerDay.rooms[objIndex].rates[basePlanIndex].contract =
                                            contract?._id;
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
                                        ].rateComments = [
                                            contract.isTourismFeeIncluded === true
                                                ? "price includes mandatory tourism fees."
                                                : "price excludes mandatory tourism fees and is payable directly at the hotel.",
                                        ];
                                    } else if (
                                        roomPerDay?.rooms[objIndex]?.rates[basePlanIndex]
                                            ?.priority === contract?.priority
                                    ) {
                                        if (
                                            roomPerDay?.rooms[objIndex]?.rates[basePlanIndex]
                                                ?.roomPrice > roomPrice
                                        ) {
                                            roomPerDay.rooms[objIndex].rates[
                                                basePlanIndex
                                            ].contractGroup = contract?.contractGroup?._id;
                                            roomPerDay.rooms[objIndex].rates[
                                                basePlanIndex
                                            ].contract = contract?._id;
                                            roomPerDay.rooms[objIndex].rates[
                                                basePlanIndex
                                            ].roomPrice = roomPrice;
                                            roomPerDay.rooms[objIndex].rates[
                                                basePlanIndex
                                            ].netPrice =
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
                                            ].rateComments = [
                                                contract.isTourismFeeIncluded === true
                                                    ? "price includes mandatory tourism fees."
                                                    : "price excludes mandatory tourism fees and is payable directly at the hotel.",
                                            ];
                                        }
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
                                // add condition by child policy and ages
                                if (boardTypesWithKeyVal[mealSupplements[ab]?.boardType]) {
                                    const mealSupplementPrice =
                                        totalAdults * mealSupplements[ab]?.adultPrice +
                                        extrabedAppliedChildren * mealSupplements[ab]?.childPrice +
                                        extrabedAppliedInfants * mealSupplements[ab]?.infantPrice;

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
                                                    // allocationType: allocation?.allocationType,
                                                    // availableAllocation,
                                                    cancellationPolicies:
                                                        filteredCancellationPolicies,
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
                                                // allocationType: allocation?.allocationType,
                                                // availableAllocation,
                                                cancellationPolicies: filteredCancellationPolicies,
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
                                                ].contractGroup = contract?.contractGroup?._id;
                                                roomPerDay.rooms[objIndex].rates[
                                                    basePlanIndex
                                                ].contract = contract?._id;
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
                                                ].rateComments = [
                                                    contract.isTourismFeeIncluded === true
                                                        ? "price includes mandatory tourism fees."
                                                        : "price excludes mandatory tourism fees and is payable directly at the hotel.",
                                                ];
                                            } else if (
                                                roomPerDay?.rooms[objIndex]?.rates[basePlanIndex]
                                                    ?.priority === contract?.priority
                                            ) {
                                                if (
                                                    roomPerDay?.rooms[objIndex]?.rates[
                                                        basePlanIndex
                                                    ]?.roomPrice > roomPrice
                                                ) {
                                                    roomPerDay.rooms[objIndex].rates[
                                                        basePlanIndex
                                                    ].contractGroup = contract?.contractGroup?._id;
                                                    roomPerDay.rooms[objIndex].rates[
                                                        basePlanIndex
                                                    ].contract = contract?._id;
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
                                                    ].extraBedSupplementPrice =
                                                        extraBedSupplementPrice;
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
                                                    ].rateComments = [
                                                        contract.isTourismFeeIncluded === true
                                                            ? "price includes mandatory tourism fees."
                                                            : "price excludes mandatory tourism fees and is payable directly at the hotel.",
                                                    ];
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
        }

        return roomPerDay;
    } catch (err) {
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
                        contract: obj.rates[j].contract,
                        contractGroup: obj.rates[j].contractGroup,
                        mealSupplementPrice: obj.rates[j].mealSupplementPrice,
                        extraBedSupplementPrice: obj.rates[j].extraBedSupplementPrice,
                        childSupplementPrice: obj.rates[j].childSupplementPrice,
                        roomPrice: obj.rates[j].roomPrice,
                        netPrice: obj.rates[j]?.netPrice,
                        selectedRoomOccupancies:
                            JSON.parse(JSON.stringify(obj.rates[j]))?.selectedRoomOccupancies || [],
                        isSpecialRate: obj.rates[j]?.isSpecialRate,
                        applyPromotion: obj.rates[j]?.applyPromotion,
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

                            for (let m = 0; m < promiseRes?.rooms[k]?.rates?.length; m++) {
                                // matching each days base plans with another days baseplans
                                // there is different combinations with baseplan and mealSupplement
                                // myRate?.basePlan?.toString() ===
                                //     promiseRes?.rooms[k]?.rates[m]?.basePlan?.toString() &&
                                // myRate?.boardCode ===
                                //     promiseRes?.rooms[k]?.rates[m]?.boardCode?.toString()
                                // check this working or not
                                if (
                                    myRate?.basePlan?.toString() ===
                                        promiseRes?.rooms[k]?.rates[m]?.basePlan?.toString() &&
                                    myRate?.mealSupplement?._id?.toString() ===
                                        promiseRes?.rooms[k]?.rates[
                                            m
                                        ]?.mealSupplement?._id?.toString()
                                ) {
                                    // combining multiple days prices to a single field
                                    myRate.mealSupplementPrice +=
                                        promiseRes?.rooms[k]?.rates[m]?.mealSupplementPrice;
                                    myRate.roomPrice += promiseRes?.rooms[k]?.rates[m]?.roomPrice;
                                    myRate.netPrice += promiseRes?.rooms[k]?.rates[m]?.netPrice;
                                    myRate.grossPrice += promiseRes?.rooms[k]?.rates[m]?.netPrice;

                                    // allocation
                                    // if (
                                    //     myRate.allocationType === "stop-sale" ||
                                    //     promiseRes?.rooms[k]?.rates[m]?.allocationType ===
                                    //         "stop-sale"
                                    // ) {
                                    //     myRate.allocationType = "stop-sale";
                                    //     myRate.availableAllocation = 0;
                                    // } else if (
                                    //     myRate.availableAllocation >
                                    //     promiseRes?.rooms[k]?.rates[m]?.availableAllocation
                                    // ) {
                                    //     myRate.availableAllocation =
                                    //         promiseRes?.rooms[k]?.rates[m]?.availableAllocation;
                                    // }

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
                                                    promiseRes?.rooms[k]?.rates[m]?.mandatoryAddOns[
                                                        ao
                                                    ]?.dates[0],
                                                ],
                                            };
                                        } else {
                                            myAddOns = [
                                                ...myAddOns,
                                                promiseRes?.rooms[k]?.rates[m]?.mandatoryAddOns[ao],
                                            ];
                                        }
                                    }

                                    obj.rates[l].mandatoryAddOns = myAddOns;

                                    // pushing single days contracts to an array
                                    // each array contains date and contract field
                                    myRate.contracts.push({
                                        date: promiseRes?.date,
                                        contract: promiseRes?.rooms[k]?.rates[m]?.contract,
                                        contractGroup:
                                            promiseRes?.rooms[k]?.rates[m]?.contractGroup,
                                        mealSupplementPrice:
                                            promiseRes?.rooms[k]?.rates[m]?.mealSupplementPrice,
                                        extraBedSupplementPrice:
                                            promiseRes?.rooms[k]?.rates[m]?.extraBedSupplementPrice,
                                        childSupplementPrice:
                                            promiseRes?.rooms[k]?.rates[m]?.childSupplementPrice,
                                        roomPrice: promiseRes?.rooms[k]?.rates[m]?.roomPrice,
                                        netPrice: promiseRes?.rooms[k]?.rates[m]?.netPrice,
                                        selectedRoomOccupancies:
                                            promiseRes?.rooms[k]?.rates[m]?.selectedRoomOccupancies,
                                        isSpecialRate:
                                            promiseRes?.rooms[k]?.rates[m]?.isSpecialRate,
                                        applyPromotion:
                                            promiseRes?.rooms[k]?.rates[m]?.applyPromotion,
                                    });
                                }
                            }
                        }
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
                resultRooms.push(obj);
            }
        }

        return resultRooms;
    } catch (err) {
        throw err;
    }
};

const singleRoomTypeRate = async (
    noOfAdults,
    noOfChildren,
    childrenAges,
    checkInDate,
    checkOutDate,
    hotelId,
    roomTypeId,
    boardTypeCode,
    isTourismFeeIncluded
) => {
    try {
        if (!isValidObjectId(hotelId)) {
            throw new Error("invalid hotel id");
        }
        const hotel = await Hotel.findOne({
            _id: hotelId,
            isDeleted: false,
            isActive: true,
            isPublished: true,
        })
            .populate("country state city area starCategory")
            .lean();
        if (!hotel) {
            throw new Error("hotel not found");
        }

        if (hotel?.isContractAvailable === false) {
            throw new Error("sorry, hotel doesn't allow booking with contract!");
        }

        if (!isValidObjectId(roomTypeId)) {
            throw new Error("invalid room type id");
        }

        const roomType = await RoomType.findOne({
            _id: roomTypeId,
            isDeleted: false,
            hotel: hotelId,
            isActive: true,
        });

        if (!roomType) {
            throw new Error("room type not found");
        }

        const dates = getDates(checkInDate, checkOutDate);
        if (
            new Date(checkInDate) >= new Date(checkOutDate) ||
            new Date(checkInDate) < new Date(new Date().setHours(0, 0, 0, 0))
        ) {
            throw new Error("invalid dates. Please select a valid dates");
        }
        const noOfNights = dates.length - 1;

        const date1 = new Date();
        const date2 = new Date(checkInDate);
        const diffTime = Math.abs(date2 - date1);
        const bookBefore = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const boardType = await HotelBoardType.findOne({
            boardShortName: boardTypeCode?.toUpperCase(),
            // isDeleted: false,
        });
        if (!boardType) {
            throw new Error("board type not found");
        }

        const promises = [];
        for (let i = 0; i < dates.length - 1; i++) {
            response = getSingleDayAvailabilityWithoutRooms({
                date: dates[i],
                hotel,
                roomType,
                noOfAdults,
                noOfChildren,
                childrenAges,
                noOfNights,
                boardType,
            });
            promises.push(response);
        }

        const promiseResponse = await Promise.all([...promises]);

        // console.log(JSON.stringify(promiseResponse, null, 2));

        const promotionAppliedData = await combineAndSelectOneItemAndAddPromotion({
            promiseResponse,
            hotelId,
            roomTypeId,
            bookBefore,
            checkInDate,
        });

        if (!promotionAppliedData || promotionAppliedData?.length < 1) {
            throw new Error("sorry, there is no price with selected date and combination");
        }

        const perPersonRate = [];

        for (let i = 0; i < allOccupancies?.length; i++) {
            const occupancy = allOccupancies[i];

            const selOccupancy = promotionAppliedData?.find((item) => {
                return item.occupancy === occupancy;
            });
            if (selOccupancy) {
                let tourismFee = 0;
                if (isTourismFeeIncluded === true && tourismDirhamFees[hotel.starCategory]) {
                    tourismFee = tourismDirhamFees[hotel.starCategory] || 0;
                }

                console.log(isTourismFeeIncluded, tourismDirhamFees[hotel.starCategory]);

                const divisor = occupancy === "DBL" ? 2 : occupancy === "TPL" ? 3 : 1;
                perPersonRate.push({
                    occupancyShortName: occupancy,
                    price:
                        (selOccupancy?.occupancyPrice +
                            selOccupancy?.addOnPrice +
                            selOccupancy?.mealSupplementPrice +
                            selOccupancy?.extraBedSupplementPrice) /
                            divisor +
                        (tourismFee * noOfNights) / divisor,
                });
            } else {
                perPersonRate.push({ occupancyShortName: occupancy, price: "" });
            }
        }

        return {
            hotel: {
                _id: hotel?._id,
                hotelName: hotel?.hotelName,
                starCategory: hotel?.starCategory,
                country: {
                    countryName: hotel?.country?.countryName,
                },
                state: {
                    stateName: hotel?.state?.stateName,
                },
                city: {
                    _id: hotel?.city?._id,
                    cityName: hotel?.city?.cityName,
                },
                area: {
                    _id: hotel?.area?._id,
                    areaName: hotel?.area?.areaName,
                },
            },
            roomType: {
                roomName: roomType?.roomName,
            },
            boardType: {
                boardShortName: boardType?.boardShortName,
                boardName: boardType?.boardName,
            },
            cancellationType: promotionAppliedData?.cancellationType,
            rates: perPersonRate,
        };
    } catch (err) {
        throw new Error(err);
    }
};

const getSingleDayAvailabilityWithoutRooms = async ({
    date,
    hotel,
    roomType,
    noOfAdults,
    noOfChildren,
    childrenAges,
    noOfNights,
    boardType,
}) => {
    try {
        const hotelId = hotel?._id;
        const returnData = []; // [{ date: "", basePlan: "", mealSupplement: "", occupancies: {} }]
        const day = getDayName(date);

        if (!hotel?.openDays?.includes(day)) {
            return returnData;
        }

        const contracts = await HotelContract.find({
            hotel: Types.ObjectId(hotelId),
            sellFrom: { $lte: new Date(date) },
            sellTo: { $gte: new Date(date) },
            isDeleted: false,
            isActive: true,
            $or: [
                {
                    isSpecialRate: true,
                    bookingWindowFrom: { $lte: new Date() },
                    bookingWindowTo: { $gte: new Date() },
                },
                { isSpecialRate: false },
            ],
        })
            .populate("contractGroup")
            .populate("parentContract", "cancellationPolicies")
            .lean();

        const addOns = await HotelAddOn.find({
            hotel: hotelId,
            fromDate: { $lte: new Date(date) },
            toDate: { $gte: new Date(date) },
            isMandatory: true,
            isDeleted: false,
        }).lean();

        for (let i = 0; i < contracts.length; i++) {
            let contract = contracts[i];

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

            if (contract?.contractGroup?.isDeleted === false && isDateExcluded === false) {
                const allocation = await HotelAllocation.findOne({
                    date: date,
                    hotel: hotelId,
                    roomType: roomType?._id,
                    contractGroup: contract?.contractGroup?._id,
                });

                if (allocation?.allocationType === "stop-sale") {
                    continue;
                }

                const myData = {
                    date,
                    contractGroup: contract?.contractGroup?._id,
                    contract: contract?._id,
                    isSpecialRate: contract?.isSpecialRate,
                    applyPromotion: contract?.applyPromotion,
                    basePlan: contract.basePlan,
                    mealSupplement: "",
                    priority: contract?.priority,
                    occupancyPrice: { SGL: "", DBL: "", TPL: "", CWB: "", CNB: "" },
                    addOnPrice: { SGL: 0, DBL: 0, TPL: 0, CWB: 0, CNB: 0 },
                    mealSupplementPrice: { SGL: 0, DBL: 0, TPL: 0, CWB: 0, CNB: 0 },
                    extraBedSupplementPrice: { SGL: 0, DBL: 0, TPL: 0, CWB: 0, CNB: 0 },
                    cancellationPolicies: [],
                    extraBedAddedInTPL: false,
                    isContractedRate: allocation?.rateType === "contract-rate",
                };

                const rooomRates = contract?.roomRates?.filter((item) => {
                    return (
                        new Date(item?.fromDate) <= new Date(date) &&
                        new Date(item?.toDate) >= new Date(date) &&
                        item?.minimumLengthOfStay <= noOfNights &&
                        item?.maximumLengthOfStay >= noOfNights &&
                        item?.validDays?.includes(day)
                    );
                });

                const sortedRoomOccupancies = roomType?.roomOccupancies?.filter((item) => {
                    return item?.isActive === true;
                });

                for (let oc = 0; oc < Object.keys(myData.occupancyPrice)?.length - 1; oc++) {
                    let occupancy = Object.keys(myData.occupancyPrice)[oc];
                    if (
                        (occupancy === "SGL" && noOfAdults >= 1) ||
                        (occupancy === "DBL" && noOfAdults >= 2) ||
                        (occupancy === "TPL" && noOfAdults >= 3)
                    ) {
                        let occIndex = sortedRoomOccupancies.findIndex((item) => {
                            return item?.shortName === occupancy;
                        });
                        if (occIndex !== -1) {
                            for (let rt = 0; rt < rooomRates[0]?.roomTypes?.length; rt++) {
                                if (
                                    rooomRates[0]?.roomTypes[rt]?.roomTypeId?.toString() ===
                                    roomType?._id?.toString()
                                ) {
                                    const rateOccupancyIndex = rooomRates[0]?.roomTypes[
                                        rt
                                    ]?.roomOccupancies?.findIndex((item) => {
                                        return (
                                            item?.occupancyId?.toString() ===
                                            sortedRoomOccupancies[occIndex]?._id?.toString()
                                        );
                                    });

                                    if (rateOccupancyIndex !== -1) {
                                        let tempRoomPrice;
                                        rooomRates?.forEach((rmRate) => {
                                            if (
                                                rmRate?.roomTypes[rt]?.roomOccupancies[
                                                    rateOccupancyIndex
                                                ]?.price &&
                                                (!tempRoomPrice ||
                                                    rmRate?.roomTypes[rt]?.roomOccupancies[
                                                        rateOccupancyIndex
                                                    ]?.price < tempRoomPrice)
                                            ) {
                                                tempRoomPrice =
                                                    rmRate?.roomTypes[rt]?.roomOccupancies[
                                                        rateOccupancyIndex
                                                    ]?.price;
                                            }
                                        });

                                        if (tempRoomPrice) {
                                            myData.occupancyPrice[occupancy] = tempRoomPrice;
                                            myData.extraBedSupplementPrice[occupancy] = 0;
                                        }
                                    }

                                    break;
                                }
                            }
                        }
                    } else if (occupancy === "CWB" || occupancy === "CNB") {
                        const filteredChildPolicies = contract?.childPolicies?.filter((item) => {
                            return (
                                item?.roomTypes?.some(
                                    (item) => item?.toString() === roomType?._id?.toString()
                                ) &&
                                new Date(item?.fromDate) <= new Date(date) &&
                                new Date(item?.toDate) >= new Date(date)
                            );
                        });

                        if (filteredChildPolicies?.length > 0) {
                            for (let cp = 0; cp < filteredChildPolicies?.length; cp++) {
                                const childPolicy = filteredChildPolicies[cp];
                                const policiesArr = childPolicy?.policies
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
                                    for (let pl = 0; pl < policiesArr.length; pl++) {
                                        const policy = policiesArr[pl];
                                        if (policy.beddingIclusive === true) {
                                            for (let ag = 0; ag < childrenAges?.length; ag++) {
                                                if (
                                                    childrenAges[ag] >= childPolicy?.fromAge &&
                                                    childrenAges[ag] <= childPolicy?.toAge
                                                ) {
                                                    myData.occupancyPrice["CNB"] =
                                                        policy.mealCharge || 0;
                                                    break;
                                                }
                                            }
                                        }
                                        if (policy.beddingIclusive === false) {
                                            for (let ag = 0; ag < childrenAges?.length; ag++) {
                                                if (
                                                    childrenAges[ag] >= childPolicy?.fromAge &&
                                                    childrenAges[ag] <= childPolicy?.toAge
                                                ) {
                                                    myData.occupancyPrice["CWB"] =
                                                        policy.totalCharge;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // APPLYING EXTRA BED POLICY
                        if (occupancy === "CWB" && !myData.occupancyPrice["CWB"]) {
                            const filteredExtraSupplements = contract?.extraSupplements?.filter(
                                (item) => {
                                    return (
                                        item?.roomTypes?.some(
                                            (item) => item?.toString() === roomType?._id?.toString()
                                        ) &&
                                        new Date(item?.fromDate) <= new Date(date) &&
                                        new Date(item?.toDate) >= new Date(date)
                                    );
                                }
                            );
                            if (filteredExtraSupplements?.length > 0 && Number(noOfChildren) > 0) {
                                const filteredExtraSupplement = filteredExtraSupplements[0];
                                if (filteredExtraSupplement?.isMealIncluded === true) {
                                    myData.occupancyPrice["CWB"] =
                                        filteredExtraSupplement?.extraBedChildPrice;
                                } else {
                                    myData.occupancyPrice["CWB"] =
                                        filteredExtraSupplement?.extraBedChildPrice +
                                        (filteredExtraSupplement?.exbMealPriceChild || 0);
                                }
                            }
                        }
                    }

                    if (myData.occupancyPrice["DBL"] && occupancy === "DBL" && noOfAdults >= 3) {
                        const filteredExtraSupplements = contract?.extraSupplements?.filter(
                            (item) => {
                                return (
                                    item?.roomTypes?.some(
                                        (item) => item?.toString() === roomType?._id?.toString()
                                    ) &&
                                    new Date(item?.fromDate) <= new Date(date) &&
                                    new Date(item?.toDate) >= new Date(date)
                                );
                            }
                        );
                        if (filteredExtraSupplements?.length > 0) {
                            const filteredExtraSupplement = filteredExtraSupplements[0];

                            myData.occupancyPrice["TPL"] = myData.occupancyPrice["DBL"];
                            if (filteredExtraSupplement.isMealIncluded === true) {
                                myData.extraBedSupplementPrice["TPL"] =
                                    filteredExtraSupplement?.extraBedAdultPrice;
                            } else {
                                myData.extraBedSupplementPrice["TPL"] =
                                    filteredExtraSupplement?.extraBedAdultPrice +
                                    (filteredExtraSupplement?.exbMealPriceAdult || 0);
                            }
                            myData.extraBedAddedInTPL = true;
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

                if (filteredAddOns?.length > 0) {
                    filteredAddOns?.map((item) => {
                        if (item?.applyOn === "pax") {
                            myData.addOnPrice.SGL += item?.adultPrice;
                            myData.addOnPrice.DBL += item?.adultPrice * 2;
                            myData.addOnPrice.TPL += item?.adultPrice * 3;
                            myData.addOnPrice.CWB += item?.childPrice;
                            myData.addOnPrice.CNB += item?.infantPrice;
                        } else if (item?.applyOn === "room") {
                            myData.addOnPrice.SGL += item?.roomPrice;
                            myData.addOnPrice.DBL += item?.roomPrice;
                            myData.addOnPrice.TPL += item?.roomPrice;
                        } else {
                            throw new Error("something went wrong on mandatory addons");
                        }
                    });
                }

                // applying cancellation policy
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

                myData.cancellationPolicies = filteredCancellationPolicies;

                if (contract?.basePlan?.toString() === boardType?._id?.toString()) {
                    for (let oc = 0; oc < allOccupancies?.length; oc++) {
                        const occupancy = allOccupancies[oc];
                        if (
                            !isNaN(myData.occupancyPrice[occupancy]) &&
                            myData.occupancyPrice[occupancy] !== null &&
                            myData.occupancyPrice[occupancy] !== ""
                        ) {
                            const returnDataObjIndex = returnData?.findIndex((item) => {
                                return (
                                    item?.basePlan?.toString() === contract?.basePlan?.toString() &&
                                    item?.mealSupplement === ""
                                );
                            });

                            if (returnDataObjIndex !== -1) {
                                if (
                                    !isNaN(
                                        returnData[returnDataObjIndex]?.occupancies[occupancy]
                                            ?.occupancyPrice
                                    ) &&
                                    returnData[returnDataObjIndex]?.occupancies[occupancy]
                                        ?.occupancyPrice !== null &&
                                    returnData[returnDataObjIndex]?.occupancies[occupancy]
                                        ?.occupancyPrice !== ""
                                ) {
                                    if (
                                        returnData[returnDataObjIndex].occupancies[occupancy]
                                            ?.priority < myData.priority
                                    ) {
                                        returnData[returnDataObjIndex].contractPriority =
                                            myData.priority;
                                        returnData[returnDataObjIndex].occupancies[occupancy] = {
                                            contractGroup: myData.contractGroup,
                                            contract: myData.contract,
                                            isSpecialRate: myData.isSpecialRate,
                                            applyPromotion: myData.applyPromotion,
                                            basePlan: myData.basePlan,
                                            mealSupplement: myData.mealSupplement,
                                            priority: myData.priority,
                                            occupancyPrice: myData.occupancyPrice[occupancy],
                                            addOnPrice: myData.addOnPrice[occupancy],
                                            mealSupplementPrice:
                                                myData.mealSupplementPrice[occupancy],
                                            extraBedSupplementPrice:
                                                myData.extraBedSupplementPrice[occupancy],
                                            cancellationPolicies: myData.cancellationPolicies,
                                            originalOccupancy:
                                                occupancy === "TPL" && myData?.extraBedAddedInTPL
                                                    ? "DBL"
                                                    : occupancy,
                                            isContractedRate: myData.isContractedRate,
                                        };
                                    } else if (
                                        returnData[returnDataObjIndex].occupancies[occupancy]
                                            ?.priority === myData.priority &&
                                        returnData[returnDataObjIndex]?.occupancies[occupancy]
                                            ?.occupancyPrice > myData.occupancyPrice[occupancy]
                                    ) {
                                        returnData[returnDataObjIndex].contractPriority =
                                            myData.priority;
                                        returnData[returnDataObjIndex].occupancies[occupancy] = {
                                            contractGroup: myData.contractGroup,
                                            contract: myData.contract,
                                            isSpecialRate: myData.isSpecialRate,
                                            applyPromotion: myData.applyPromotion,
                                            basePlan: myData.basePlan,
                                            mealSupplement: myData.mealSupplement,
                                            priority: myData.priority,
                                            occupancyPrice: myData.occupancyPrice[occupancy],
                                            addOnPrice: myData.addOnPrice[occupancy],
                                            mealSupplementPrice:
                                                myData.mealSupplementPrice[occupancy],
                                            extraBedSupplementPrice:
                                                myData.extraBedSupplementPrice[occupancy],
                                            cancellationPolicies: myData.cancellationPolicies,
                                            originalOccupancy:
                                                occupancy === "TPL" && myData?.extraBedAddedInTPL
                                                    ? "DBL"
                                                    : occupancy,
                                            isContractedRate: myData.isContractedRate,
                                        };
                                    }
                                } else {
                                    if (returnData[returnDataObjIndex]?.occupancies) {
                                        returnData[returnDataObjIndex].contractPriority =
                                            myData.priority;
                                        returnData[returnDataObjIndex].occupancies[occupancy] = {
                                            contractGroup: myData.contractGroup,
                                            contract: myData.contract,
                                            isSpecialRate: myData.isSpecialRate,
                                            applyPromotion: myData.applyPromotion,
                                            basePlan: myData.basePlan,
                                            mealSupplement: myData.mealSupplement,
                                            priority: myData.priority,
                                            occupancyPrice: myData.occupancyPrice[occupancy],
                                            addOnPrice: myData.addOnPrice[occupancy],
                                            mealSupplementPrice:
                                                myData.mealSupplementPrice[occupancy],
                                            extraBedSupplementPrice:
                                                myData.extraBedSupplementPrice[occupancy],
                                            cancellationPolicies: myData.cancellationPolicies,
                                            originalOccupancy:
                                                occupancy === "TPL" && myData?.extraBedAddedInTPL
                                                    ? "DBL"
                                                    : occupancy,
                                            isContractedRate: myData.isContractedRate,
                                        };
                                    } else {
                                        returnData[returnDataObjIndex] = {
                                            date,
                                            basePlan: myData.basePlan,
                                            contractPriority: myData.priority,
                                            mealSupplement: myData.mealSupplement,
                                            occupancies: {
                                                [occupancy]: {
                                                    contractGroup: myData.contractGroup,
                                                    contract: myData.contract,
                                                    isSpecialRate: myData.isSpecialRate,
                                                    applyPromotion: myData.applyPromotion,
                                                    basePlan: myData.basePlan,
                                                    mealSupplement: myData.mealSupplement,
                                                    priority: myData.priority,
                                                    occupancyPrice:
                                                        myData.occupancyPrice[occupancy],
                                                    addOnPrice: myData.addOnPrice[occupancy],
                                                    mealSupplementPrice:
                                                        myData.mealSupplementPrice[occupancy],
                                                    extraBedSupplementPrice:
                                                        myData.extraBedSupplementPrice[occupancy],
                                                    cancellationPolicies:
                                                        myData.cancellationPolicies,
                                                    originalOccupancy:
                                                        occupancy === "TPL" &&
                                                        myData?.extraBedAddedInTPL
                                                            ? "DBL"
                                                            : occupancy,
                                                    isContractedRate: myData.isContractedRate,
                                                },
                                            },
                                        };
                                    }
                                }
                            } else {
                                returnData.push({
                                    date,
                                    basePlan: myData.basePlan,
                                    contractPriority: myData.priority,
                                    mealSupplement: myData.mealSupplement,
                                    occupancies: {
                                        [occupancy]: {
                                            contractGroup: myData.contractGroup,
                                            contract: myData.contract,
                                            isSpecialRate: myData.isSpecialRate,
                                            applyPromotion: myData.applyPromotion,
                                            basePlan: myData.basePlan,
                                            mealSupplement: myData.mealSupplement,
                                            priority: myData.priority,
                                            occupancyPrice: myData.occupancyPrice[occupancy],
                                            addOnPrice: myData.addOnPrice[occupancy],
                                            mealSupplementPrice:
                                                myData.mealSupplementPrice[occupancy],
                                            extraBedSupplementPrice:
                                                myData.extraBedSupplementPrice[occupancy],
                                            cancellationPolicies: myData.cancellationPolicies,
                                            originalOccupancy:
                                                occupancy === "TPL" && myData?.extraBedAddedInTPL
                                                    ? "DBL"
                                                    : occupancy,
                                            isContractedRate: myData.isContractedRate,
                                        },
                                    },
                                });
                            }
                        }
                    }
                }

                myData.mealSupplement = boardType?._id;
                const mealSupplements = contract.mealSupplements?.filter((item) => {
                    return (
                        new Date(item?.fromDate) <= new Date(date) &&
                        new Date(item?.toDate) >= new Date(date) &&
                        item?.roomTypes?.some(
                            (item) => item?.toString() === roomType?._id?.toString()
                        )
                    );
                });

                if (mealSupplements.length > 0) {
                    for (let ab = 0; ab < mealSupplements.length; ab++) {
                        if (
                            mealSupplements[ab].boardType?.toString() === boardType?._id?.toString()
                        ) {
                            myData.mealSupplementPrice.SGL = mealSupplements[ab]?.adultPrice;
                            myData.mealSupplementPrice.DBL = mealSupplements[ab]?.adultPrice * 2;
                            myData.mealSupplementPrice.TPL = mealSupplements[ab]?.adultPrice * 3;
                            // myData.mealSupplementPrice.CWB = mealSupplements[ab]?.childPrice;
                            // myData.mealSupplementPrice.CNB = mealSupplements[ab]?.infantPrice;

                            for (let oc = 0; oc < allOccupancies?.length; oc++) {
                                const occupancy = allOccupancies[oc];
                                if (occupancy !== "CWB" && occupancy !== "CNB") {
                                    if (
                                        !isNaN(myData.occupancyPrice[occupancy]) &&
                                        myData.occupancyPrice[occupancy] !== null &&
                                        myData.occupancyPrice[occupancy] !== "" &&
                                        myData.mealSupplementPrice[occupancy] >= 0
                                    ) {
                                        const returnDataObjIndex = returnData?.findIndex((item) => {
                                            return (
                                                item?.basePlan?.toString() ===
                                                    contract?.basePlan?.toString() &&
                                                item?.mealSupplement?.toString() ===
                                                    myData.mealSupplement?.toString()
                                            );
                                        });

                                        if (returnDataObjIndex !== -1) {
                                            if (
                                                !isNaN(
                                                    returnData[returnDataObjIndex]?.occupancies[
                                                        occupancy
                                                    ]?.occupancyPrice
                                                ) &&
                                                returnData[returnDataObjIndex]?.occupancies[
                                                    occupancy
                                                ]?.occupancyPrice !== null &&
                                                returnData[returnDataObjIndex]?.occupancies[
                                                    occupancy
                                                ]?.occupancyPrice !== ""
                                            ) {
                                                if (
                                                    returnData[returnDataObjIndex].occupancies[
                                                        occupancy
                                                    ]?.priority < myData.priority
                                                ) {
                                                    returnData[
                                                        returnDataObjIndex
                                                    ].contractPriority = myData.priority;
                                                    returnData[returnDataObjIndex].occupancies[
                                                        occupancy
                                                    ] = {
                                                        contractGroup: myData.contractGroup,
                                                        contract: myData.contract,
                                                        isSpecialRate: myData.isSpecialRate,
                                                        applyPromotion: myData.applyPromotion,
                                                        basePlan: myData.basePlan,
                                                        mealSupplement: myData.mealSupplement,
                                                        priority: myData.priority,
                                                        occupancyPrice:
                                                            myData.occupancyPrice[occupancy],
                                                        addOnPrice: myData.addOnPrice[occupancy],
                                                        mealSupplementPrice:
                                                            myData.mealSupplementPrice[occupancy],
                                                        extraBedSupplementPrice:
                                                            myData.extraBedSupplementPrice[
                                                                occupancy
                                                            ],
                                                        cancellationPolicies:
                                                            myData.cancellationPolicies,
                                                        originalOccupancy:
                                                            occupancy === "TPL" &&
                                                            myData?.extraBedAddedInTPL
                                                                ? "DBL"
                                                                : occupancy,
                                                        isContractedRate: myData.isContractedRate,
                                                    };
                                                } else if (
                                                    returnData[returnDataObjIndex].occupancies[
                                                        occupancy
                                                    ]?.priority === myData.priority &&
                                                    returnData[returnDataObjIndex]?.occupancies[
                                                        occupancy
                                                    ]?.occupancyPrice >
                                                        myData.occupancyPrice[occupancy]
                                                ) {
                                                    returnData[
                                                        returnDataObjIndex
                                                    ].contractPriority = myData.priority;
                                                    returnData[returnDataObjIndex].occupancies[
                                                        occupancy
                                                    ] = {
                                                        contractGroup: myData.contractGroup,
                                                        contract: myData.contract,
                                                        isSpecialRate: myData.isSpecialRate,
                                                        applyPromotion: myData.applyPromotion,
                                                        basePlan: myData.basePlan,
                                                        mealSupplement: myData.mealSupplement,
                                                        priority: myData.priority,
                                                        occupancyPrice:
                                                            myData.occupancyPrice[occupancy],
                                                        addOnPrice: myData.addOnPrice[occupancy],
                                                        mealSupplementPrice:
                                                            myData.mealSupplementPrice[occupancy],
                                                        extraBedSupplementPrice:
                                                            myData.extraBedSupplementPrice[
                                                                occupancy
                                                            ],
                                                        cancellationPolicies:
                                                            myData.cancellationPolicies,
                                                        originalOccupancy:
                                                            occupancy === "TPL" &&
                                                            myData?.extraBedAddedInTPL
                                                                ? "DBL"
                                                                : occupancy,
                                                        isContractedRate: myData.isContractedRate,
                                                    };
                                                }
                                            } else {
                                                if (returnData[returnDataObjIndex]?.occupancies) {
                                                    returnData[
                                                        returnDataObjIndex
                                                    ].contractPriority = myData.priority;
                                                    returnData[returnDataObjIndex].occupancies[
                                                        occupancy
                                                    ] = {
                                                        contractGroup: myData.contractGroup,
                                                        contract: myData.contract,
                                                        isSpecialRate: myData.isSpecialRate,
                                                        applyPromotion: myData.applyPromotion,
                                                        basePlan: myData.basePlan,
                                                        mealSupplement: myData.mealSupplement,
                                                        priority: myData.priority,
                                                        occupancyPrice:
                                                            myData.occupancyPrice[occupancy],
                                                        addOnPrice: myData.addOnPrice[occupancy],
                                                        mealSupplementPrice:
                                                            myData.mealSupplementPrice[occupancy],
                                                        extraBedSupplementPrice:
                                                            myData.extraBedSupplementPrice[
                                                                occupancy
                                                            ],
                                                        cancellationPolicies:
                                                            myData.cancellationPolicies,
                                                        originalOccupancy:
                                                            occupancy === "TPL" &&
                                                            myData?.extraBedAddedInTPL
                                                                ? "DBL"
                                                                : occupancy,
                                                        isContractedRate: myData.isContractedRate,
                                                    };
                                                } else {
                                                    returnData[returnDataObjIndex] = {
                                                        date,
                                                        basePlan: myData.basePlan,
                                                        mealSupplement: myData.mealSupplement,
                                                        contractPriority: myData.priority,
                                                        occupancies: {
                                                            [occupancy]: {
                                                                contractGroup: myData.contractGroup,
                                                                contract: myData.contract,
                                                                isSpecialRate: myData.isSpecialRate,
                                                                applyPromotion:
                                                                    myData.applyPromotion,
                                                                basePlan: myData.basePlan,
                                                                mealSupplement:
                                                                    myData.mealSupplement,
                                                                priority: myData.priority,
                                                                occupancyPrice:
                                                                    myData.occupancyPrice[
                                                                        occupancy
                                                                    ],
                                                                addOnPrice:
                                                                    myData.addOnPrice[occupancy],
                                                                mealSupplementPrice:
                                                                    myData.mealSupplementPrice[
                                                                        occupancy
                                                                    ],
                                                                extraBedSupplementPrice:
                                                                    myData.extraBedSupplementPrice[
                                                                        occupancy
                                                                    ],
                                                                cancellationPolicies:
                                                                    myData.cancellationPolicies,
                                                                originalOccupancy:
                                                                    occupancy === "TPL" &&
                                                                    myData?.extraBedAddedInTPL
                                                                        ? "DBL"
                                                                        : occupancy,
                                                                isContractedRate:
                                                                    myData.isContractedRate,
                                                            },
                                                        },
                                                    };
                                                }
                                            }
                                        } else {
                                            returnData.push({
                                                date,
                                                basePlan: myData.basePlan,
                                                mealSupplement: myData.mealSupplement,
                                                contractPriority: myData.priority,
                                                occupancies: {
                                                    [occupancy]: {
                                                        contractGroup: myData.contractGroup,
                                                        contract: myData.contract,
                                                        isSpecialRate: myData.isSpecialRate,
                                                        applyPromotion: myData.applyPromotion,
                                                        basePlan: myData.basePlan,
                                                        mealSupplement: myData.mealSupplement,
                                                        priority: myData.priority,
                                                        occupancyPrice:
                                                            myData.occupancyPrice[occupancy],
                                                        addOnPrice: myData.addOnPrice[occupancy],
                                                        mealSupplementPrice:
                                                            myData.mealSupplementPrice[occupancy],
                                                        extraBedSupplementPrice:
                                                            myData.extraBedSupplementPrice[
                                                                occupancy
                                                            ],
                                                        cancellationPolicies:
                                                            myData.cancellationPolicies,
                                                        originalOccupancy:
                                                            occupancy === "TPL" &&
                                                            myData?.extraBedAddedInTPL
                                                                ? "DBL"
                                                                : occupancy,
                                                        isContractedRate: myData.isContractedRate,
                                                    },
                                                },
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

        returnData.sort((a, b) => b.contractPriority - a.contractPriority);

        return returnData;
    } catch (err) {
        throw err;
    }
};

const combineAndSelectOneItemAndAddPromotion = async ({
    promiseResponse,
    hotelId,
    roomTypeId,
    bookBefore,
    checkInDate,
}) => {
    try {
        const returnItem = [];

        for (let h = 0; h < allOccupancies?.length; h++) {
            const occupancy = allOccupancies[h];

            for (let i = 0; i < promiseResponse[0]?.length; i++) {
                let matched = true;
                if (
                    promiseResponse[0][i]?.occupancies[occupancy] &&
                    !isNaN(promiseResponse[0][i]?.occupancies[occupancy]?.occupancyPrice) &&
                    promiseResponse[0][i]?.occupancies[occupancy]?.occupancyPrice !== null
                ) {
                    let item = {
                        occupancyPrice:
                            promiseResponse[0][i]?.occupancies[occupancy]?.occupancyPrice,
                        addOnPrice: promiseResponse[0][i]?.occupancies[occupancy]?.addOnPrice,
                        mealSupplementPrice:
                            promiseResponse[0][i]?.occupancies[occupancy]?.mealSupplementPrice,
                        extraBedSupplementPrice:
                            promiseResponse[0][i]?.occupancies[occupancy]?.extraBedSupplementPrice,
                        basePlan: promiseResponse[0][i]?.basePlan,
                        mealSupplement: promiseResponse[0][i]?.mealSupplement,
                        contracts: [
                            {
                                date: promiseResponse[0][i]?.date,
                                contractGroup:
                                    promiseResponse[0][i]?.occupancies[occupancy]?.contractGroup,
                                contract: promiseResponse[0][i]?.occupancies[occupancy]?.contract,
                                isSpecialRate:
                                    promiseResponse[0][i]?.occupancies[occupancy]?.isSpecialRate,
                                applyPromotion:
                                    promiseResponse[0][i]?.occupancies[occupancy]?.applyPromotion,
                                occupancyPrice:
                                    promiseResponse[0][i]?.occupancies[occupancy]?.occupancyPrice,
                                mealSupplementPrice:
                                    promiseResponse[0][i]?.occupancies[occupancy]
                                        ?.mealSupplementPrice,
                                extraBedSupplementPrice:
                                    promiseResponse[0][i]?.occupancies[occupancy]
                                        ?.extraBedSupplementPrice,
                                isContractedRate:
                                    promiseResponse[0][i]?.occupancies[occupancy]?.isContractedRate,
                            },
                        ],
                        originalOccupancy:
                            promiseResponse[0][i]?.occupancies[occupancy]?.originalOccupancy,
                    };

                    for (let j = 1; j < promiseResponse?.length; j++) {
                        let found = false;
                        for (let k = 0; k < promiseResponse[j].length; k++) {
                            if (
                                item?.basePlan?.toString() ===
                                    promiseResponse[j][k]?.basePlan?.toString() &&
                                item?.mealSupplement?.toString() ===
                                    promiseResponse[j][k]?.mealSupplement?.toString() &&
                                promiseResponse[j][k]?.occupancies[occupancy] &&
                                !isNaN(
                                    promiseResponse[j][k]?.occupancies[occupancy]?.occupancyPrice
                                ) &&
                                promiseResponse[j][k]?.occupancies[occupancy]?.occupancyPrice !==
                                    null
                            ) {
                                item.occupancyPrice +=
                                    promiseResponse[j][k]?.occupancies[occupancy]?.occupancyPrice;
                                item.addOnPrice +=
                                    promiseResponse[j][k]?.occupancies[occupancy]?.addOnPrice;
                                item.mealSupplementPrice +=
                                    promiseResponse[j][k]?.occupancies[
                                        occupancy
                                    ]?.mealSupplementPrice;
                                item.extraBedSupplementPrice +=
                                    promiseResponse[j][k]?.occupancies[
                                        occupancy
                                    ]?.extraBedSupplementPrice;

                                item.contracts.push({
                                    date: promiseResponse[j][k]?.date,
                                    contract:
                                        promiseResponse[j][k]?.occupancies[occupancy]?.contract,
                                    occupancyPrice:
                                        promiseResponse[j][k]?.occupancies[occupancy]
                                            ?.occupancyPrice,
                                    mealSupplementPrice:
                                        promiseResponse[j][k]?.occupancies[occupancy]
                                            ?.mealSupplementPrice,
                                    contractGroup:
                                        promiseResponse[j][k]?.occupancies[occupancy]
                                            ?.contractGroup,
                                    isSpecialRate:
                                        promiseResponse[j][k]?.occupancies[occupancy]
                                            ?.isSpecialRate,
                                    applyPromotion:
                                        promiseResponse[j][k]?.occupancies[occupancy]
                                            ?.applyPromotion,
                                    extraBedSupplementPrice:
                                        promiseResponse[j][k]?.occupancies[occupancy]
                                            ?.extraBedSupplementPrice,
                                    isContractedRate:
                                        promiseResponse[j][k]?.occupancies[occupancy]
                                            ?.isContractedRate,
                                });
                                found = true;
                                break;
                            }
                        }

                        if (found === false) {
                            matched = false;
                        }
                    }
                    if (matched) {
                        returnItem.push({
                            occupancy,
                            ...item,
                        });
                        break;
                    }
                }
            }
        }

        // console.log(returnItem);

        if (!returnItem || returnItem?.length < 1) {
            throw new Error(
                "sorry there is no availability on selected date. please choose different date or hotel"
            );
        }

        for (let i = 0; i < returnItem?.length; i++) {
            let retutnOccupancy = returnItem[i];

            if (retutnOccupancy?.occupancy === "CWB" || retutnOccupancy?.occupancy === "CNB") {
                continue;
            }

            const contractGroups = [];
            // sorting multiple contracts of each base plan to single contracts array and
            // counting continues number Of nights in each contract.

            for (let k = 0; k < retutnOccupancy.contracts.length; k++) {
                const objIndex = contractGroups?.findIndex((contract) => {
                    return (
                        contract?.contractGroup?.toString() ===
                        retutnOccupancy.contracts[k].contractGroup?.toString()
                    );
                });
                if (
                    retutnOccupancy.contracts[k]?.applyPromotion === true &&
                    retutnOccupancy.contracts[k]?.isContractedRate === false
                ) {
                    if (objIndex == -1) {
                        contractGroups.push({
                            contractGroup: retutnOccupancy.contracts[k].contractGroup,
                            dates: [
                                {
                                    date: retutnOccupancy.contracts[k].date,
                                    contract: retutnOccupancy.contracts[k].contract,
                                    isSpecialRate: retutnOccupancy.contracts[k].isSpecialRate,
                                },
                            ],
                            noOfNights: 1,
                        });
                    } else {
                        contractGroups[objIndex].dates.push({
                            date: retutnOccupancy.contracts[k].date,
                            contract: retutnOccupancy.contracts[k].contract,
                            isSpecialRate: retutnOccupancy.contracts[k].isSpecialRate,
                        });
                        contractGroups[objIndex].noOfNights += 1;
                    }
                }
            }

            for (let l = 0; l < contractGroups.length; l++) {
                // TODO:
                // fetch this from one place
                const promotions = await HotelPromotion.find({
                    hotel: hotelId,
                    contractGroups: contractGroups[l]?.contractGroup,
                    bookingWindowFrom: { $lte: new Date(new Date().setHours(0, 0, 0, 0)) },
                    bookingWindowTo: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                    isDeleted: false,
                    specificNations: false,
                })
                    .populate({
                        path: "combinedPromotions",
                        options: { sort: { priority: -1 } },
                    })
                    .sort({ priority: -1 })
                    .lean();

                // run with each promotion and compare prize and append added promotion with contracts
                const { promotion, totalOffer } = await applyPromotionSingleRate({
                    promotions,
                    selectedContract: contractGroups[l],
                    roomTypeId,
                    bookBefore,
                    retutnOccupancy,
                    isFirstIteration: l === 0,
                });

                if (contractGroups[l].dates?.includes(checkInDate) && promotion) {
                    if (promotion?.cancellationPolicies?.length > 0) {
                        const filteredCancellationPolicies =
                            promotion?.cancellationPolicies?.filter((item) => {
                                return (
                                    new Date(item?.fromDate) <= new Date(checkInDate) &&
                                    new Date(item?.toDate) >= new Date(checkInDate) &&
                                    item?.roomTypes?.some(
                                        (item) => item?.toString() === roomTypeId?.toString()
                                    )
                                );
                            });

                        if (filteredCancellationPolicies?.length > 0) {
                            cancellationPolicies = filteredCancellationPolicies;
                        }
                    }
                }

                if (returnItem[i].occupancyPrice - totalOffer < 0) {
                    returnItem[i].occupancyPrice = 0;
                } else {
                    returnItem[i].occupancyPrice -= totalOffer;
                }
            }
        }

        // let cancellationPolicies = returnItem?.cancellationPolicies;

        // let cancellationType = "Non Refundable";
        // let allCancellationTypes = [];
        // if (cancellationPolicies?.length < 1) {
        //     cancellationType = "Non Refundable";
        // } else {
        //     const sortedCancellationPolicies = cancellationPolicies?.sort((a, b) => {
        //         return b.daysBefore - a.daysBefore;
        //     });
        //     for (let cp = 0; cp < sortedCancellationPolicies?.length; cp++) {
        //         let policy = sortedCancellationPolicies[cp];

        //         if (policy?.cancellationChargeType === "non-refundable") {
        //             allCancellationTypes = [];
        //             break;
        //         } else if (policy?.cancellationCharge === 0) {
        //             allCancellationTypes.push("refundable");
        //         } else if (policy?.cancellationChargeType === "percentage") {
        //             if (policy?.cancellationCharge === 100) {
        //                 allCancellationTypes.push("non-refundable");
        //             } else {
        //                 allCancellationTypes.push("partially-refundable");
        //             }
        //         } else if (policy?.cancellationChargeType === "night") {
        //             allCancellationTypes.push("partially-refundable");
        //         } else if (policy?.cancellationChargeType === "flat") {
        //             allCancellationTypes.push("partially-refundable");
        //         }
        //     }

        //     if (allCancellationTypes?.includes("partially-refundable")) {
        //         cancellationType = "Partially Refundable";
        //     } else if (
        //         allCancellationTypes?.includes("refundable") &&
        //         !allCancellationTypes?.includes("non-refundable")
        //     ) {
        //         cancellationType = "Refundable";
        //     } else if (
        //         allCancellationTypes?.includes("refundable") &&
        //         allCancellationTypes?.includes("non-refundable")
        //     ) {
        //         cancellationType = "Partially Refundable";
        //     } else {
        //         cancellationType = "Non Refundable";
        //     }
        // }

        // returnItem.cancellationType = cancellationType;

        return returnItem;
    } catch (err) {
        throw err;
    }
};

const applyPromotionSingleRate = async ({
    promotions,
    selectedContract,
    roomTypeId,
    bookBefore,
    retutnOccupancy,
}) => {
    try {
        let allStayPays = [];
        let allDiscounts = [];

        for (let qi = 0; qi < promotions?.length; qi++) {
            const promotion = promotions[qi];
            const tempStayPays = [];
            const tempDiscounts = [];

            const allTempStayPays = [];
            const allTempDiscounts = [];

            for (let qj = 0; qj < selectedContract.dates?.length; qj++) {
                const date = selectedContract.dates[qj]?.date;
                const day = getDayName(date);

                let isDateExcluded = false;
                // checking date is excluded or not for applying promotion
                promotion?.excludedDates?.map((dateRange) => {
                    if (
                        new Date(dateRange?.fromDate) > new Date(date) &&
                        new Date(dateRange?.toDate) < new Date(date) &&
                        dateRange?.roomTypes?.some(
                            (rmType) => rmType?.toString() === roomTypeId?.toString()
                        )
                    ) {
                        isDateExcluded = true;
                    }
                });

                if (
                    (selectedContract.dates[qj]?.isSpecialRate === true
                        ? promotion?.applicableOnRatePromotion === true
                        : true) &&
                    promotion?.contractGroups?.some(
                        (item) => item?.toString() === selectedContract?.contractGroup?.toString()
                    ) &&
                    new Date(promotion?.sellFrom) <= new Date(date) &&
                    new Date(promotion?.sellTo) >= new Date(date) &&
                    new Date(promotion?.bookingWindowFrom) <=
                        new Date(new Date().setHours(0, 0, 0, 0)) &&
                    new Date(promotion?.bookingWindowTo) >=
                        new Date(new Date().setHours(0, 0, 0, 0)) &&
                    promotion?.validDays?.includes(day) &&
                    isDateExcluded === false
                ) {
                    if (promotion?.isStayPayAvailable === true) {
                        const stayPays = promotion?.stayPays?.filter((item) => {
                            return (
                                new Date(item?.fromDate) <= new Date(date) &&
                                new Date(item?.toDate) >= new Date(date) &&
                                item?.roomTypes?.some(
                                    (item) => item?.toString() === roomTypeId?.toString()
                                ) &&
                                item?.boardTypes?.some(
                                    (item) =>
                                        item?.toString() === retutnOccupancy?.basePlan?.toString()
                                ) &&
                                item?.bookBefore <= bookBefore
                            );
                        });

                        if (stayPays?.length > 0) {
                            for (let ab = 0; ab < stayPays.length; ab++) {
                                const objIndex = tempStayPays.findIndex((item) => {
                                    return item?._id?.toString() === stayPays[ab]?._id?.toString();
                                });
                                if (objIndex === -1) {
                                    tempStayPays.push({
                                        ...stayPays[ab],
                                        noOfNights: 1,
                                        dates: [date],
                                    });
                                } else {
                                    tempStayPays[objIndex].noOfNights += 1;
                                    tempStayPays[objIndex].dates?.push(date);
                                }
                            }
                        }
                    }

                    if (promotion?.isDiscountAvailable === true) {
                        const discounts = promotion?.discounts?.filter((item) => {
                            return (
                                new Date(item?.fromDate) <= new Date(date) &&
                                new Date(item?.toDate) >= new Date(date) &&
                                item?.roomTypes?.some(
                                    (item) =>
                                        item?.roomTypeId?.toString() === roomTypeId?.toString()
                                ) &&
                                item?.boardTypes?.some(
                                    (item) =>
                                        item?.toString() === retutnOccupancy?.basePlan?.toString()
                                ) &&
                                item?.bookBefore <= bookBefore
                            );
                        });

                        if (discounts?.length > 0) {
                            for (let ab = 0; ab < discounts.length; ab++) {
                                const objIndex = tempDiscounts.findIndex((item) => {
                                    return item?._id?.toString() === discounts[ab]?._id?.toString();
                                });
                                if (objIndex === -1) {
                                    tempDiscounts.push({
                                        ...discounts[ab],
                                        noOfNights: 1,
                                        dates: [{ date }],
                                    });
                                } else {
                                    tempDiscounts[objIndex].noOfNights += 1;
                                    tempDiscounts[objIndex].dates?.push({ date });
                                }
                            }
                        }
                    }

                    // check if it is last date or end of loop
                    if (qj === selectedContract.dates?.length - 1) {
                        if (promotion?.combinedPromotions?.length > 0) {
                            for (let cp = 0; cp < promotion?.combinedPromotions?.length; cp++) {
                                const cPromo = promotion?.combinedPromotions[cp];
                                let compTempDiscounts = [];
                                let compTempStayPays = [];

                                for (let cm = 0; cm < selectedContract.dates?.length; cm++) {
                                    const date = selectedContract.dates[cm]?.date;
                                    const day = getDayName(date);

                                    if (
                                        (selectedContract.dates[cm]?.isSpecialRate === true
                                            ? cPromo?.applicableOnRatePromotion === true
                                            : true) &&
                                        cPromo?.contractGroups?.some(
                                            (item) =>
                                                item?.toString() ===
                                                selectedContract?.contractGroup?.toString()
                                        ) &&
                                        new Date(cPromo?.sellFrom) <= new Date(date) &&
                                        new Date(cPromo?.sellTo) >= new Date(date) &&
                                        new Date(cPromo?.bookingWindowFrom) <=
                                            new Date(new Date().setHours(0, 0, 0, 0)) &&
                                        new Date(cPromo?.bookingWindowTo) >=
                                            new Date(new Date().setHours(0, 0, 0, 0)) &&
                                        cPromo?.validDays?.includes(day)
                                    ) {
                                        if (cPromo?.isStayPayAvailable === true) {
                                            if (
                                                selectedContract.dates[qj]?.isSpecialRate === true
                                                    ? cPromo?.applicableOnRatePromotion === true
                                                    : true
                                            ) {
                                                const stayPays = cPromo?.stayPays?.filter(
                                                    (item) => {
                                                        return (
                                                            new Date(item?.fromDate) <=
                                                                new Date(date) &&
                                                            new Date(item?.toDate) >=
                                                                new Date(date) &&
                                                            item?.roomTypes?.some(
                                                                (item) =>
                                                                    item?.toString() ===
                                                                    roomTypeId?.toString()
                                                            ) &&
                                                            item?.boardTypes?.some(
                                                                (item) =>
                                                                    item?.toString() ===
                                                                    retutnOccupancy?.basePlan?.toString()
                                                            ) &&
                                                            item?.bookBefore <= bookBefore
                                                        );
                                                    }
                                                );

                                                if (stayPays?.length > 0) {
                                                    for (let ab = 0; ab < stayPays.length; ab++) {
                                                        const objIndex = compTempStayPays.findIndex(
                                                            (item) => {
                                                                return (
                                                                    item?._id?.toString() ===
                                                                    stayPays[ab]?._id?.toString()
                                                                );
                                                            }
                                                        );
                                                        if (objIndex === -1) {
                                                            compTempStayPays.push({
                                                                ...stayPays[ab],
                                                                noOfNights: 1,
                                                                dates: [date],
                                                            });
                                                        } else {
                                                            compTempStayPays[
                                                                objIndex
                                                            ].noOfNights += 1;
                                                            compTempStayPays[objIndex].dates?.push(
                                                                date
                                                            );
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        if (cPromo?.isDiscountAvailable === true) {
                                            const discounts = cPromo?.discounts?.filter((item) => {
                                                return (
                                                    new Date(item?.fromDate) <= new Date(date) &&
                                                    new Date(item?.toDate) >= new Date(date) &&
                                                    item?.roomTypes?.some(
                                                        (item) =>
                                                            item?.roomTypeId?.toString() ===
                                                            roomTypeId?.toString()
                                                    ) &&
                                                    item?.boardTypes?.some(
                                                        (item) =>
                                                            item?.toString() ===
                                                            retutnOccupancy?.basePlan?.toString()
                                                    ) &&
                                                    item?.bookBefore <= bookBefore
                                                );
                                            });

                                            if (discounts?.length > 0) {
                                                for (let ab = 0; ab < discounts.length; ab++) {
                                                    const objIndex = compTempDiscounts.findIndex(
                                                        (item) => {
                                                            return (
                                                                item?._id?.toString() ===
                                                                discounts[ab]?._id?.toString()
                                                            );
                                                        }
                                                    );
                                                    if (objIndex === -1) {
                                                        compTempDiscounts.push({
                                                            ...discounts[ab],
                                                            noOfNights: 1,
                                                            dates: [{ date }],
                                                        });
                                                    } else {
                                                        compTempDiscounts[objIndex].noOfNights += 1;
                                                        compTempDiscounts[objIndex].dates?.push({
                                                            date,
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                if (compTempStayPays?.length > 0) {
                                    allTempStayPays?.push({
                                        promotion: cPromo,
                                        stayPays: compTempStayPays,
                                    });
                                }
                                if (compTempDiscounts?.length > 0) {
                                    allTempDiscounts?.push({
                                        promotion: cPromo,
                                        discounts: compTempDiscounts,
                                    });
                                }
                            }
                        }
                    }
                }
            }

            if (tempStayPays.length > 0) {
                allStayPays.push({
                    promotion,
                    stayPays: tempStayPays,
                    combinedPromotions: allTempStayPays,
                });
            }
            if (tempDiscounts?.length > 0) {
                allDiscounts?.push({
                    promotion,
                    discounts: tempDiscounts,
                    combinedPromotions: allTempDiscounts,
                });
            }
        }

        let stayPayOffer = 0;
        let appliedStayPays = [];
        const appliedStayPayDates = [];

        const applyStayPayOnEachItem = ({ filteredStayPays, staypayPromotion }) => {
            try {
                const tempAppliedStayPayDates = [];
                while (true) {
                    let isOneTimeFlag = false;
                    for (let ac = 0; ac < filteredStayPays?.length; ac++) {
                        if (
                            appliedStayPayDates?.some((date) =>
                                filteredStayPays[ac].dates?.includes(date)
                            )
                        ) {
                            continue;
                        }
                        if (filteredStayPays[ac]?.noOfNights >= filteredStayPays[ac]?.stayCount) {
                            let tempIndex = -1;
                            if (staypayPromotion?.stayPayFreeOn === "last-night") {
                                tempIndex = retutnOccupancy.contracts?.findIndex((item) => {
                                    return (
                                        item?.date ===
                                        filteredStayPays[ac].dates[
                                            filteredStayPays[ac].dates?.length - 1
                                        ]
                                    );
                                });
                            } else {
                                tempIndex = retutnOccupancy.contracts?.findIndex((item) => {
                                    return item?.date === filteredStayPays[ac].dates[0];
                                });
                            }
                            if (tempIndex !== -1) {
                                let tempValue = retutnOccupancy[tempIndex]?.occupancyPrice;
                                for (let ad = 0; ad < retutnOccupancy.contracts?.length; ad++) {
                                    if (staypayPromotion?.stayPayFreeOn === "cheapest") {
                                        if (
                                            tempValue <
                                                retutnOccupancy.contracts[ad].occupancyPrice &&
                                            filteredStayPays[ac].dates?.includes(
                                                retutnOccupancy.contracts[ad]?.date
                                            )
                                        ) {
                                            tempValue =
                                                retutnOccupancy.contracts[ad].occupancyPrice;
                                            tempIndex = ad;
                                        }
                                    } else if (staypayPromotion?.stayPayFreeOn === "highest") {
                                        if (
                                            tempValue >
                                                retutnOccupancy.contracts[ad].occupancyPrice &&
                                            filteredStayPays[ac].dates?.includes(
                                                retutnOccupancy.contracts[ad]?.date
                                            )
                                        ) {
                                            tempValue =
                                                retutnOccupancy.contracts[ad].occupancyPrice;
                                            tempIndex = ad;
                                        }
                                    }
                                }
                                filteredStayPays[ac].noOfNights -= filteredStayPays[ac]?.stayCount;
                                stayPayOffer += tempValue;
                                appliedStayPays.push({
                                    promotion: staypayPromotion?._id,
                                    rateCode: filteredStayPays[ac]?.rateCode,
                                    dates: filteredStayPays[ac]?.dates,
                                    discount: tempValue,
                                });
                                tempAppliedStayPayDates.push(...filteredStayPays[ac]?.dates);
                                isOneTimeFlag = true;
                            }
                        }
                    }

                    if (staypayPromotion?.multipleStayPay === false || isOneTimeFlag === false) {
                        break;
                    }
                }

                return { appliedDates: tempAppliedStayPayDates };
            } catch (err) {
                throw err;
            }
        };

        if (allStayPays?.length > 0) {
            for (let ab = 0; ab < allStayPays?.length; ab++) {
                const staypayPromotion = allStayPays[ab]?.promotion;
                const filteredStayPays = allStayPays[ab]?.stayPays?.sort((a, b) => {
                    return b?.freeCount - a?.freeCount;
                });

                const { appliedDates } = applyStayPayOnEachItem({
                    filteredStayPays,
                    staypayPromotion,
                });

                appliedStayPayDates?.push(...appliedDates);

                for (let ag = 0; ag < allStayPays[ab]?.combinedPromotions?.length; ag++) {
                    const staypayPromotion = allStayPays[ab]?.combinedPromotions[ag]?.promotion;
                    const filteredStayPays = allStayPays[ab]?.combinedPromotions[
                        ag
                    ]?.stayPays?.sort((a, b) => {
                        return b?.freeCount - a?.freeCount;
                    });

                    const { appliedDates } = applyStayPayOnEachItem({
                        filteredStayPays,
                        staypayPromotion,
                    });

                    appliedStayPayDates?.push(...appliedDates);
                }
            }
        }

        let appliedDiscounts = [];
        let discountOffer = 0;

        let appliedDiscountDates = [];

        const applyDiscountsOnEachItem = ({
            discountPromo,
            sortedDiscounts,
            appliedDates,
            dateCheck,
        }) => {
            try {
                let tempAppliedDates = [];
                if (sortedDiscounts?.length > 0) {
                    for (let ac = 0; ac < sortedDiscounts?.length; ac++) {
                        for (let ae = 0; ae < sortedDiscounts[ac]?.dates?.length; ae++) {
                            for (let ad = 0; ad < appliedDiscounts?.length; ad++) {
                                if (
                                    appliedDiscounts[ad]?.dates?.includes(
                                        sortedDiscounts[ac]?.dates[ae]?.date
                                    )
                                ) {
                                    sortedDiscounts[ac]?.dates?.splice(ae, 1);
                                    sortedDiscounts[ac].noOfNights -= 1;
                                }
                            }
                        }
                        if (
                            sortedDiscounts[ac]?.noOfNights >=
                                sortedDiscounts[ac]?.minimumLengthOfStay &&
                            sortedDiscounts[ac]?.noOfNights <=
                                sortedDiscounts[ac]?.maximumLengthOfStay
                        ) {
                            for (let sc = 0; sc < sortedDiscounts[ac]?.dates?.length; sc++) {
                                if (
                                    (dateCheck === false &&
                                        !appliedDates?.includes(
                                            sortedDiscounts[ac]?.dates[sc]?.date
                                        )) ||
                                    (dateCheck === true &&
                                        appliedDates?.includes(
                                            sortedDiscounts[ac]?.dates[sc]?.date
                                        ))
                                ) {
                                    continue;
                                }

                                const dateObjIndex = retutnOccupancy.contracts?.findIndex(
                                    (item) => {
                                        return item?.date === sortedDiscounts[ac]?.dates[sc]?.date;
                                    }
                                );
                                if (dateObjIndex !== -1) {
                                    for (
                                        let sd = 0;
                                        sd < sortedDiscounts[ac]?.roomTypes?.length;
                                        sd++
                                    ) {
                                        let disRoomType = sortedDiscounts[ac]?.roomTypes[sd];
                                        if (
                                            disRoomType?.roomTypeId?.toString() ===
                                            roomTypeId?.toString()
                                        ) {
                                            const discountObjIndex =
                                                disRoomType?.roomOccupancies?.findIndex((item) => {
                                                    return (
                                                        item?.shortName ===
                                                        retutnOccupancy?.originalOccupancy
                                                    );
                                                });

                                            if (
                                                discountObjIndex !== -1 &&
                                                disRoomType?.roomOccupancies[discountObjIndex]
                                                    ?.discount
                                            ) {
                                                let appliedTempDiscount = 0;
                                                if (sortedDiscounts[ac]?.discountType === "flat") {
                                                    appliedTempDiscount +=
                                                        disRoomType?.roomOccupancies[
                                                            discountObjIndex
                                                        ]?.discount;
                                                } else {
                                                    if (
                                                        discountPromo?.isApplicableForExtraBed ===
                                                        true
                                                    ) {
                                                        appliedTempDiscount +=
                                                            (disRoomType?.roomOccupancies[
                                                                discountObjIndex
                                                            ]?.discount /
                                                                100) *
                                                            retutnOccupancy.contracts[dateObjIndex]
                                                                ?.extraBedSupplementPrice;
                                                    }
                                                    if (
                                                        discountPromo?.isApplicableForSupplement ===
                                                        true
                                                    ) {
                                                        appliedTempDiscount +=
                                                            (disRoomType?.roomOccupancies[
                                                                discountObjIndex
                                                            ]?.discount /
                                                                100) *
                                                            retutnOccupancy.contracts[dateObjIndex]
                                                                ?.mealSupplementPrice;
                                                    }
                                                    if (
                                                        retutnOccupancy?.addOnPrice > 0 &&
                                                        discountPromo?.isApplicableForAddOn === true
                                                    ) {
                                                        appliedTempDiscount +=
                                                            (disRoomType?.roomOccupancies[
                                                                discountObjIndex
                                                            ]?.discount /
                                                                100) *
                                                            retutnOccupancy?.addOnPrice;
                                                    }
                                                    appliedTempDiscount +=
                                                        (disRoomType?.roomOccupancies[
                                                            discountObjIndex
                                                        ]?.discount /
                                                            100) *
                                                        retutnOccupancy.contracts[dateObjIndex]
                                                            ?.occupancyPrice;
                                                }
                                                discountOffer += appliedTempDiscount;
                                                appliedDiscounts.push({
                                                    promotion: discountPromo?._id,
                                                    rateCode: sortedDiscounts[ac]?.rateCode,
                                                    dates: [sortedDiscounts[ac]?.dates[sc]?.date],
                                                    discount: appliedTempDiscount,
                                                });
                                                tempAppliedDates.push(
                                                    sortedDiscounts[ac]?.dates[sc]?.date
                                                );
                                            }

                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                return { appliedDates: tempAppliedDates };
            } catch (err) {
                throw err;
            }
        };

        if (allDiscounts?.length > 0) {
            for (let af = 0; af < allDiscounts?.length; af++) {
                let mainDiscount = allDiscounts[af];
                let discountPromo = mainDiscount?.promotion;

                const sortedDiscounts = mainDiscount?.discounts
                    ?.sort((a, b) => {
                        return b?.bookBefore - a?.bookBefore;
                    })
                    .sort((a, b) => {
                        return b?.minimumLengthOfStay - a?.minimumLengthOfStay;
                    });

                const { appliedDates } = applyDiscountsOnEachItem({
                    discountPromo,
                    sortedDiscounts,
                    appliedDates: appliedDiscountDates,
                    dateCheck: true,
                });

                appliedDiscountDates?.push(...appliedDates);

                for (let ag = 0; ag < mainDiscount?.combinedPromotions?.length; ag++) {
                    let discountPromo = mainDiscount?.combinedPromotions[ag]?.promotion;

                    const sortedDiscounts = mainDiscount?.combinedPromotions[ag]?.discounts
                        ?.sort((a, b) => {
                            return b?.bookBefore - a?.bookBefore;
                        })
                        .sort((a, b) => {
                            return b?.minimumLengthOfStay - a?.minimumLengthOfStay;
                        });

                    applyDiscountsOnEachItem({
                        discountPromo,
                        sortedDiscounts,
                        appliedDates,
                        dateCheck: false,
                    });
                }
            }
        }

        return {
            promotion: allDiscounts[0]?.promotion,
            stayPayOffer,
            appliedStayPays,
            discountOffer,
            appliedDiscounts,
            totalOffer: stayPayOffer + discountOffer,
        };
    } catch (err) {
        throw err;
    }
};

const getSingleHotelAvailabilityQtn = async ({
    fromDate,
    toDate,
    hotel,
    noOfNights,
    rooms,
    dates,
    totalAdults,
    totalChildren,
    roomsCount,
    roomTypes,
    boardTypes,
    allContracts,
    allAddOns,
    allAllocations,
}) => {
    try {
        let roomTypesWithKeyVal = {};
        let boardTypesWithKeyVal = {};
        roomTypes
            ?.filter((item) => {
                return item.hotel?.toString() === hotel?._id?.toString();
            })
            ?.forEach((rmType) => {
                roomTypesWithKeyVal[rmType?._id] = rmType;
            });
        boardTypes
            ?.filter((bt) => {
                return hotel?.boardTypes?.some((item) => item?.toString() === bt?._id?.toString());
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
                roomsCount,
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
        // console.log(promiseResponse[0]?.rooms[0]?.rates);

        const resultRooms = combineMultipleDayHotelPricesSG(promiseResponse);

        let lowPrice = 99999999;
        const allRooms = [];
        for (let i = 0; i < resultRooms?.length; i++) {
            const boardTypes = [];
            for (let j = 0; j < resultRooms[i]?.rates?.length; j++) {
                if (i === 0 && j === 0) {
                    lowPrice = resultRooms[i]?.rates[j]?.grossPrice;
                } else if (lowPrice > resultRooms[i]?.rates[j]?.grossPrice) {
                    lowPrice = resultRooms[i]?.rates[j]?.grossPrice;
                }
                if (
                    !boardTypes.some(
                        (item) => item?.boardCode === resultRooms[i]?.rates[j]?.boardCode
                    )
                ) {
                    boardTypes.push({
                        boardName: resultRooms[i]?.rates[j]?.boardName,
                        boardCode: resultRooms[i]?.rates[j]?.boardCode,
                    });
                }
            }
            if (boardTypes?.length > 0) {
                allRooms.push({
                    roomName: roomTypesWithKeyVal[resultRooms[i]?.roomTypeId]?.roomName,
                    roomTypeId: resultRooms[i]?.roomTypeId,
                    boardTypes,
                });
            }
        }

        return {
            hotel: {
                _id: hotel?._id,
                hotelName: hotel?.hotelName,
                address: hotel?.address,
                country: hotel?.country,
                state: hotel?.state,
                starCategory: hotel?.starCategory,
                city: hotel?.city,
                area: hotel?.area,
                image: hotel?.images[0],
            },
            roomTypes: allRooms,
            lowPrice,
        };
    } catch (err) {
        throw err;
    }
};

module.exports = { singleRoomTypeRate, getSingleHotelAvailabilityQtn };
