const moment = require("moment");
const {
    RoomType,
    HotelBoardType,
    HotelContract,
    HotelAddOn,
    HotelPromotion,
    HotelAllocation,
} = require("../../../models/hotel");
const { getDayName, formatDate } = require("../../../utils");

const fetchContractDatas = async (hotel, nationality, fromDate, toDate) => {
    try {
        const contractHotelIds = [hotel._id];

        const todayStart = moment().startOf("day");

        const roomTypesPromise = RoomType.find({
            isDeleted: false,
            hotel: contractHotelIds,
            isActive: true,
            "roomOccupancies.0": { $exists: true },
        })
            .populate("amenities", "name")
            .lean();

        const boardTypesPromise = HotelBoardType.find().lean();

        const allContractsPromise = HotelContract.find({
            hotel: contractHotelIds,
            isDeleted: false,
            status: "approved",
            $and: [
                {
                    $or: [
                        {
                            specificNations: true,
                            applicableNations: nationality?.toUpperCase(),
                            "applicableNations.0": { $exists: true },
                        },
                        { specificNations: false },
                    ],
                },
                {
                    $or: [
                        {
                            isSpecialRate: true,
                            bookingWindowFrom: { $lte: todayStart },
                            bookingWindowTo: { $gte: todayStart },
                        },
                        { isSpecialRate: false },
                    ],
                },
            ],
        })
            .populate("contractGroup")
            .populate("parentContract", "cancellationPolicies")
            .lean();

        const allAddOnsPromise = HotelAddOn.find({
            hotel: contractHotelIds,
            isDeleted: false,
        }).lean();

        const allPromotionsPromise = HotelPromotion.find({
            hotel: contractHotelIds,
            bookingWindowFrom: { $lte: todayStart },
            bookingWindowTo: { $gte: todayStart },
            isDeleted: false,
            isActive: true,
            $or: [
                {
                    specificNations: true,
                    applicableNations: nationality?.toUpperCase(),
                    "applicableNations.0": { $exists: true },
                },
                { specificNations: false },
            ],
        })
            .populate({
                path: "combinedPromotions",
                options: { sort: { priority: -1 } },
            })
            .sort({ priority: -1 })
            .lean();

        const allAllocationsPromise = HotelAllocation.find({
            $and: [{ date: { $gte: new Date(fromDate) } }, { date: { $lte: new Date(toDate) } }],
            hotel: contractHotelIds,
        }).lean();

        const [roomTypes, boardTypes, allContracts, allAddOns, allPromotions, allAllocations] =
            await Promise.all([
                roomTypesPromise,
                boardTypesPromise,
                allContractsPromise,
                allAddOnsPromise,
                allPromotionsPromise,
                allAllocationsPromise,
            ]);

        return {
            roomTypes,
            boardTypes,
            allContracts,
            allAddOns,
            allPromotions,
            allAllocations,
        };
    } catch (error) {
        Promise.reject(error);
    }
};

const getContractRoomRates = async (
    dates,
    rooms,
    hotel,
    noOfNights,
    totalAdults,
    totalChildren,
    fromDate,
    toDate,
    bookBefore,
    roomTypes,
    boardTypes,
    allContracts,
    allAddOns,
    allPromotions,
    allAllocations,
    clientMarkups,
    clientStarCategoryMarkups,
    subAgentMarkups,
    subAgentStarCategoryMarkups,
    marketStrategy,
    profileMarkup,
    reseller
) => {
    try {
        const roomTypesWithKeyVal = roomTypes.reduce((acc, rmType) => {
            if (rmType.hotel?.toString() === hotel?._id?.toString()) {
                acc[rmType._id] = rmType;
            }
            return acc;
        }, {});

        const boardTypesWithKeyVal = boardTypes.reduce((acc, brType) => {
            if (
                hotel?.boardTypes?.some((item) => item._id?.toString() === brType._id?.toString())
            ) {
                acc[brType._id] = brType;
            }
            return acc;
        }, {});

        const roomPerDaysPromises = dates
            .slice(0, -1)
            .map((date) =>
                getSingleDayAvailabilitySG(
                    date,
                    rooms,
                    hotel,
                    noOfNights,
                    totalAdults,
                    totalChildren,
                    rooms?.length,
                    roomTypesWithKeyVal,
                    boardTypesWithKeyVal,
                    fromDate,
                    toDate,
                    allContracts,
                    allAddOns,
                    allAllocations
                )
            );

        const roomPerDaysResponse = await Promise.all(roomPerDaysPromises);

        const resultRooms = combineMultipleDayHotelPricesSG(roomPerDaysResponse);

        const addOnresponse = await createCombinationWithAddOn(
            resultRooms,
            hotel?._id,
            fromDate,
            toDate,
            totalAdults,
            totalChildren,
            rooms?.length,
            noOfNights
        );

        // adding promotions on hotel prices
        const promotionAppliedData = await addPromotionOnHotelPricesSG(
            addOnresponse,
            bookBefore,
            roomTypesWithKeyVal,
            boardTypesWithKeyVal,
            fromDate,
            hotel?._id,
            allPromotions,
            hotel?.starCategory,
            clientMarkups,
            clientStarCategoryMarkups,
            subAgentMarkups,
            subAgentStarCategoryMarkups,
            marketStrategy,
            profileMarkup,
            reseller
        );

        let minRate = promotionAppliedData?.[0]?.rates?.[0]?.netPrice || 0;
        let maxRate = minRate;
        let totalOffer = promotionAppliedData?.[0]?.rates?.[0]?.totalOffer || 0;

        // Iterate over each promotionAppliedData
        for (let promotionData of promotionAppliedData || []) {
            // Iterate over each rate within the promotionAppliedData
            for (let rate of promotionData.rates || []) {
                // Retrieve netPrice and offer from the rate object
                const netPrice = rate.netPrice;
                const offer = rate.totalOffer || 0;

                // Update minRate if current netPrice is smaller
                if (netPrice < minRate) {
                    minRate = netPrice;
                    totalOffer = offer;
                }
                // Update maxRate if current netPrice is larger
                else if (netPrice > maxRate) {
                    maxRate = netPrice;
                }
            }
        }

        // Return the result object
        return { hotel, rooms: promotionAppliedData, minRate, maxRate, totalOffer, noOfNights };
    } catch (error) {
        Promise.reject(error);
    }
};

const getSingleDayAvailabilitySG = (
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
    allAllocations
) => {
    try {
        const roomPerDay = { date, rooms: [] };
        const hotelId = hotel?._id;
        const day = getDayName(date);

        if (!hotel?.openDays?.includes(day)) {
            return roomPerDay;
        }

        const today = moment().startOf("day"); // Calculate today once

        date = moment(new Date(date));

        const contracts = allContracts?.filter(
            (item) =>
                item?.hotel?.toString() === hotelId?.toString() &&
                moment(item?.sellFrom).isSameOrBefore(date) &&
                moment(item?.sellTo).isSameOrAfter(date) &&
                (!item?.isSpecialRate ||
                    (item?.isSpecialRate &&
                        moment(item?.bookingWindowFrom).isSameOrBefore(today) &&
                        moment(item?.bookingWindowTo).isSameOrAfter(today)))
        );

        if (!contracts?.length) {
            return roomPerDay;
        }

        const addOns = allAddOns?.filter(
            (addOn) =>
                addOn?.hotel?.toString() === hotelId?.toString() &&
                addOn?.isMandatory === true &&
                moment(addOn?.fromDate).isSameOrBefore(date) &&
                moment(addOn?.toDate).isSameOrAfter(date)
        );

        for (let i = 0; i < contracts.length; i++) {
            let contract = contracts[i];

            if (contract?.contractGroup?.isDeleted === false) {
                const roomRates = contract?.roomRates?.filter(
                    (item) =>
                        moment(item?.fromDate).isSameOrBefore(date) &&
                        moment(item?.toDate).isSameOrAfter(date) &&
                        item?.minimumLengthOfStay <= noOfNights &&
                        item?.maximumLengthOfStay >= noOfNights &&
                        item?.validDays?.includes(day)
                );

                if (roomRates && roomRates[0]?.roomTypes?.length) {
                    for (let j = 0; j < roomRates[0].roomTypes.length; j++) {
                        const roomType = roomTypesWithKeyVal[roomRates[0].roomTypes[j]?.roomTypeId];

                        // checking date is excluded or not for applying contract
                        const isDateExcluded = contract?.excludedDates?.some(
                            (dateRange) =>
                                moment(dateRange?.fromDate).isSameOrBefore(date) &&
                                moment(dateRange?.toDate).isSameOrAfter(date) &&
                                dateRange?.roomTypes?.some(
                                    (rmType) => rmType?.toString() === roomType?._id?.toString()
                                )
                        );

                        if (!roomType || isDateExcluded) {
                            continue;
                        }

                        // Find allocation using moment.js for date comparison
                        const allocation = allAllocations?.find(
                            (item) =>
                                item?.hotel?.toString() === hotelId?.toString() &&
                                moment(item?.date).isSame(date, "day") &&
                                item?.roomType?.toString() === roomType?._id?.toString() &&
                                item?.contractGroup?.toString() ===
                                    contract?.contractGroup?._id?.toString()
                        );

                        const isContractedRate = allocation?.rateType === "contract-rate";

                        let availableAllocation = 0;
                        if (allocation?.allocationType === "static") {
                            availableAllocation =
                                allocation.allocation - allocation.bookedAllocations;
                        } else if (allocation?.allocationType === "free-sale") {
                            availableAllocation = 99 - allocation.bookedAllocations;
                        }

                        const currentDate = moment();
                        const targetDate = moment(date);
                        const diffDays = targetDate.diff(currentDate, "days");

                        if (diffDays < allocation?.releaseDate) {
                            availableAllocation = 0;
                        }

                        let selectedRoomOccupancies = [];
                        let roomPrice = 0;
                        let extraBedSupplementPrice = 0;
                        let childSupplementPrice = 0;
                        let appliedRateCode = "";

                        const filteredRoomOccupancies = roomType?.roomOccupancies?.filter(
                            (item) => item?.isActive === true
                        );
                        let extrabedAppliedChildren = 0;
                        let extrabedAppliedInfants = 0;
                        let isError = false;

                        for (let op = 0; op < rooms?.length; op++) {
                            let isRoomsPaxOk = false;

                            let totalInfants = 0;
                            const allInfantAges = [];
                            const allChildrenAges = [];

                            for (const age of rooms[op]?.childrenAges || []) {
                                const numericalAge = Number(age);
                                if (
                                    numericalAge >= roomType?.infantAgeFrom &&
                                    numericalAge <= roomType?.infantAgeTo
                                ) {
                                    totalInfants++;
                                    allInfantAges.push(numericalAge);
                                } else {
                                    allChildrenAges.push(numericalAge);
                                }
                            }

                            for (const roomOccupancy of filteredRoomOccupancies) {
                                const combinations = roomOccupancy?.combinations?.sort(
                                    (a, b) => b?.adultCount - a?.adultCount
                                );

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

                                        const occupancyMatches1 =
                                            runType === "noextra" &&
                                            (noOfAdults !== combination?.adultCount ||
                                                noOfChildren !== combination?.childCount ||
                                                noOfInfants !== combination?.infantCount ||
                                                noOfAdults + noOfChildren + noOfInfants >
                                                    roomOccupancy?.maxCount);

                                        const occupancyMatches2 =
                                            runType === "exbed" &&
                                            (noOfAdults < combination?.adultCount ||
                                                noOfAdults >
                                                    combination?.adultCount +
                                                        roomOccupancy?.extraBed ||
                                                noOfChildren < combination?.childCount ||
                                                noOfChildren >
                                                    combination?.childCount +
                                                        roomOccupancy?.extraBed ||
                                                noOfInfants < combination?.infantCount ||
                                                noOfInfants >
                                                    combination?.infantCount +
                                                        roomOccupancy?.extraBed ||
                                                noOfAdults +
                                                    noOfChildren +
                                                    noOfInfants -
                                                    roomOccupancy?.extraBed >
                                                    roomOccupancy?.maxCount);

                                        const occupancyMatches3 =
                                            runType === "rollbed" &&
                                            (noOfAdults < combination?.adultCount ||
                                                noOfAdults >
                                                    combination?.adultCount +
                                                        roomOccupancy?.rollBed ||
                                                noOfChildren < combination?.childCount ||
                                                noOfChildren >
                                                    combination?.childCount +
                                                        roomOccupancy?.rollBed ||
                                                noOfInfants < combination?.infantCount ||
                                                noOfInfants >
                                                    combination?.infantCount +
                                                        roomOccupancy?.rollBed ||
                                                noOfAdults +
                                                    noOfChildren +
                                                    noOfInfants -
                                                    roomOccupancy?.rollBed >
                                                    roomOccupancy?.maxCount);

                                        const occupancyMatches4 =
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
                                                    roomOccupancy?.maxCount);

                                        if (
                                            occupancyMatches1 ||
                                            occupancyMatches2 ||
                                            occupancyMatches3 ||
                                            occupancyMatches4
                                        ) {
                                            continue;
                                        }

                                        let extraBedApplied = 0;
                                        let rollBedApplied = 0;
                                        let existingAdult = combination?.adultCount - noOfAdults;
                                        let extraBedAdults =
                                            (noOfAdults > combination?.adultCount &&
                                                noOfAdults - combination?.adultCount) ||
                                            0;

                                        const handleExistingAdult = (
                                            targetCount,
                                            targetAges,
                                            existing
                                        ) => {
                                            if (targetCount > 0 && existing > 0) {
                                                if (targetCount >= existingAdult) {
                                                    targetCount -= existingAdult;
                                                    targetAges.splice(0, existingAdult);
                                                    existingAdult = 0;
                                                } else {
                                                    existingAdult -= targetCount;
                                                    targetAges = [];
                                                    targetCount = 0;
                                                }
                                            }
                                        };

                                        handleExistingAdult(
                                            noOfChildren,
                                            childrenAges,
                                            existingAdult
                                        );
                                        handleExistingAdult(noOfInfants, infantAges, existingAdult);

                                        let applicableChildren = combination?.childCount || 0;
                                        let applicableInfants = combination?.infantCount || 0;
                                        // adding child policies to existing children and infants
                                        if (noOfInfants > 0 || noOfChildren > 0) {
                                            const filteredChildPolicies =
                                                contract?.childPolicies?.filter((item) => {
                                                    const roomTypeMatch = item?.roomTypes?.some(
                                                        (roomTypeId) =>
                                                            roomTypeId?.toString() ===
                                                            roomType?._id?.toString()
                                                    );
                                                    const dateInRange =
                                                        moment(item?.fromDate).isSameOrBefore(
                                                            date
                                                        ) &&
                                                        moment(item?.toDate).isSameOrAfter(date);

                                                    return roomTypeMatch && dateInRange;
                                                });

                                            if (filteredChildPolicies?.length) {
                                                filteredChildPolicies?.forEach((childPolicy) => {
                                                    const policiesArr = childPolicy.policies
                                                        ?.map((item) => ({
                                                            ...item,
                                                            totalCharge:
                                                                (item?.beddingCharge || 0) +
                                                                (item?.mealCharge || 0),
                                                        }))
                                                        .sort(
                                                            (a, b) => a.totalCharge - b.totalCharge
                                                        );

                                                    if (policiesArr && policiesArr?.length) {
                                                        for (const policy of policiesArr) {
                                                            let paxCount = policy.paxCount;
                                                            let tempInfantAges = [...infantAges]; // Shallow copy for modification
                                                            let tempChildrenAges = JSON.parse(
                                                                JSON.stringify(childrenAges)
                                                            ); // Deep copy for modification

                                                            // Check if infants need processing
                                                            if (noOfInfants > 0) {
                                                                for (
                                                                    let ag = 0;
                                                                    ag < tempInfantAges.length;
                                                                    ag++
                                                                ) {
                                                                    const infantAge =
                                                                        tempInfantAges[ag];
                                                                    if (
                                                                        infantAge >=
                                                                            childPolicy?.fromAge &&
                                                                        infantAge <=
                                                                            childPolicy?.toAge
                                                                    ) {
                                                                        // Check if applicable based on pax, infants, and policy conditions
                                                                        if (
                                                                            paxCount > 0 &&
                                                                            noOfInfants > 0 &&
                                                                            applicableInfants > 0
                                                                        ) {
                                                                            if (
                                                                                policy?.beddingInclusive &&
                                                                                policy?.mealInclusive
                                                                            ) {
                                                                                paxCount--;
                                                                                noOfInfants--;
                                                                                applicableInfants--;
                                                                                infantAges.splice(
                                                                                    ag,
                                                                                    1
                                                                                );
                                                                            } else {
                                                                                paxCount--;
                                                                                noOfInfants--;
                                                                                applicableInfants--;
                                                                                tempChdSupplementPrice +=
                                                                                    policy?.mealCharge ||
                                                                                    0;
                                                                                if (
                                                                                    !policy?.beddingInclusive &&
                                                                                    policy?.mealInclusive
                                                                                ) {
                                                                                    tempChdSupplementPrice +=
                                                                                        policy?.beddingCharge ||
                                                                                        0;
                                                                                } else if (
                                                                                    !policy?.beddingInclusive &&
                                                                                    !policy?.mealInclusive
                                                                                ) {
                                                                                    tempChdSupplementPrice +=
                                                                                        policy?.totalCharge ||
                                                                                        0;
                                                                                }
                                                                            }
                                                                        } else {
                                                                            break; // No need to iterate further if conditions aren't met
                                                                        }
                                                                    }
                                                                }
                                                            }

                                                            if (noOfChildren > 0) {
                                                                for (
                                                                    let ag = 0;
                                                                    ag < tempChildrenAges.length;
                                                                    ag++
                                                                ) {
                                                                    const childAge =
                                                                        tempChildrenAges[ag];
                                                                    if (
                                                                        childAge >=
                                                                            childPolicy?.fromAge &&
                                                                        childAge <=
                                                                            childPolicy?.toAge
                                                                    ) {
                                                                        if (
                                                                            paxCount > 0 &&
                                                                            noOfChildren > 0 &&
                                                                            applicableChildren > 0
                                                                        ) {
                                                                            if (
                                                                                policy?.beddingInclusive &&
                                                                                policy?.mealInclusive
                                                                            ) {
                                                                                paxCount--;
                                                                                noOfChildren--;
                                                                                applicableChildren--;
                                                                                tempChildrenAges.splice(
                                                                                    ag,
                                                                                    1
                                                                                );
                                                                            } else {
                                                                                paxCount--;
                                                                                noOfChildren--;
                                                                                applicableChildren--;
                                                                                tempChdSupplementPrice +=
                                                                                    policy?.mealCharge ||
                                                                                    0;
                                                                                if (
                                                                                    !policy?.beddingInclusive &&
                                                                                    policy?.mealInclusive
                                                                                ) {
                                                                                    tempChdSupplementPrice +=
                                                                                        policy?.beddingCharge ||
                                                                                        0;
                                                                                } else if (
                                                                                    !policy?.beddingInclusive &&
                                                                                    !policy?.mealInclusive
                                                                                ) {
                                                                                    tempChdSupplementPrice +=
                                                                                        policy?.totalCharge ||
                                                                                        0;
                                                                                }
                                                                            }
                                                                        } else {
                                                                            break; // No need to iterate further if conditions aren't met
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                });
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
                                            const filteredExtraSupplement =
                                                contract?.extraSupplements?.find(
                                                    (extraSupplement) => {
                                                        const isMatchingRoomType =
                                                            extraSupplement?.roomTypes?.some(
                                                                (roomTypeItem) =>
                                                                    roomTypeItem?.toString() ===
                                                                    roomType?._id?.toString()
                                                            );

                                                        const fromDate = moment(
                                                            extraSupplement?.fromDate
                                                        );
                                                        const toDate = moment(
                                                            extraSupplement?.toDate
                                                        );

                                                        const isDateInRange =
                                                            fromDate.isSameOrBefore(date) &&
                                                            toDate.isSameOrAfter(date);

                                                        return isMatchingRoomType && isDateInRange;
                                                    }
                                                );

                                            if (filteredExtraSupplement) {
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
                                                            extrabedAppliedChildren +=
                                                                totalExtraBeds;
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
                                                            extrabedAppliedInfants +=
                                                                totalExtraBeds;
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
                                                            extrabedAppliedChildren +=
                                                                totalRollBeds;
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

                                        if (
                                            noOfInfants > 0 ||
                                            noOfChildren > 0 ||
                                            extraBedAdults > 0
                                        ) {
                                            continue;
                                        } else {
                                            const rateOccupancyIndex = roomRates[0]?.roomTypes[
                                                j
                                            ]?.roomOccupancies?.findIndex(
                                                (item) =>
                                                    item?.occupancyId?.toString() ===
                                                    roomOccupancy?._id?.toString()
                                            );

                                            if (rateOccupancyIndex === -1) {
                                                continue;
                                            }

                                            let tempRoomPrice;
                                            roomRates?.forEach((rmRate) => {
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
                                                    appliedRateCode = rmRate?.rateCode;
                                                }
                                            });

                                            if (!tempRoomPrice) {
                                                continue;
                                            }

                                            roomPrice += tempRoomPrice;
                                            extraBedSupplementPrice += tempExBedSupplementPrice;
                                            childSupplementPrice += tempChdSupplementPrice;

                                            selectedRoomOccupancies.push({
                                                roomKey: op + 1,
                                                occupancyId: roomOccupancy?._id,
                                                occupancyName:
                                                    extraBedApplied > 0 &&
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

                        if (!isError) {
                            let totalInfants = 0;

                            // Iterate over each room
                            for (const room of rooms) {
                                for (const childAge of room.childrenAges) {
                                    const age = Number(childAge);
                                    // Check if the age falls within the infant age range for the room type
                                    if (
                                        age >= roomType?.infantAgeFrom &&
                                        age <= roomType?.infantAgeTo
                                    ) {
                                        totalInfants++;
                                    }
                                }
                            }

                            const filteredAddOns = addOns.filter(
                                ({ roomTypes, boardTypes }) =>
                                    roomTypes?.some(
                                        (roomTypeId) =>
                                            roomTypeId?.toString() === roomType?._id?.toString()
                                    ) &&
                                    boardTypes?.some(
                                        (boardTypeId) =>
                                            boardTypeId?.toString() ===
                                            contract?.basePlan?.toString()
                                    )
                            );

                            let sortedAddOns = [];

                            let mandatoryAddOnPrice = 0;
                            let totalAddOnPrice = 0;
                            if (filteredAddOns?.length) {
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

                            // Check if contract is special rate and has parent contract with cancellation policies
                            if (
                                contract?.cancellationPolicies?.length > 1 &&
                                contract?.isSpecialRate &&
                                contract?.parentContract?.cancellationPolicies?.length > 0
                            ) {
                                filteredCancellationPolicies =
                                    contract.parentContract.cancellationPolicies.filter(
                                        (item) =>
                                            moment(item.fromDate).isSameOrBefore(date) &&
                                            moment(item.toDate).isSameOrAfter(date) &&
                                            item.roomTypes?.some(
                                                (roomTypeId) =>
                                                    roomTypeId?.toString() ===
                                                    roomType?._id?.toString()
                                            )
                                    );
                            }
                            // Check if contract has cancellation policies
                            else if (contract?.cancellationPolicies?.length > 0) {
                                filteredCancellationPolicies = contract.cancellationPolicies.filter(
                                    (item) =>
                                        moment(item.fromDate).isSameOrBefore(date) &&
                                        moment(item.toDate).isSameOrAfter(date) &&
                                        item.roomTypes?.some(
                                            (roomTypeId) =>
                                                roomTypeId?.toString() === roomType?._id?.toString()
                                        )
                                );
                            }

                            const objIndex = roomPerDay?.rooms.findIndex(
                                (obj) => obj?.roomTypeId?.toString() === roomType?._id?.toString()
                            );

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
                                                    boardTypesWithKeyVal[contract?.basePlan]
                                                        ?.boardName
                                                }`,
                                                boardName:
                                                    boardTypesWithKeyVal[contract?.basePlan]
                                                        ?.boardName,
                                                boardCode:
                                                    boardTypesWithKeyVal[contract?.basePlan]
                                                        ?.boardShortName,
                                                basePlan: contract?.basePlan,
                                                basePlanDetails: {
                                                    boardName:
                                                        boardTypesWithKeyVal[contract?.basePlan]
                                                            .boardName,
                                                    boardShortName:
                                                        boardTypesWithKeyVal[contract?.basePlan]
                                                            .boardShortName,
                                                },
                                                contractGroup: contract?.contractGroup?._id,
                                                contract: contract?._id,
                                                contractDetails: {
                                                    _id: contract?._id,
                                                    rateCode: contract?.rateCode,
                                                    rateName: contract?.rateName,
                                                },
                                                isSpecialRate: contract?.isSpecialRate,
                                                appliedRateCode,
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
                                    const basePlanIndex = roomPerDay?.rooms[
                                        objIndex
                                    ]?.rates?.findIndex((obj) => {
                                        return (
                                            obj?.basePlan?.toString() ===
                                                contract?.basePlan?.toString() &&
                                            obj?.mealSupplement?._id === ""
                                        );
                                    });

                                    if (basePlanIndex === -1) {
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
                                            basePlan: contract?.basePlan,
                                            basePlanDetails: {
                                                boardName:
                                                    boardTypesWithKeyVal[contract?.basePlan]
                                                        .boardName,
                                                boardShortName:
                                                    boardTypesWithKeyVal[contract?.basePlan]
                                                        .boardShortName,
                                            },
                                            contractGroup: contract?.contractGroup?._id,
                                            contract: contract?._id,
                                            contractDetails: {
                                                _id: contract?._id,
                                                rateCode: contract?.rateCode,
                                                rateName: contract?.rateName,
                                            },
                                            isSpecialRate: contract?.isSpecialRate,
                                            appliedRateCode,
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
                                        });
                                    } else {
                                        if (
                                            roomPerDay?.rooms[objIndex]?.rates[basePlanIndex]
                                                ?.priority < contract?.priority
                                        ) {
                                            roomPerDay.rooms[objIndex].rates[
                                                basePlanIndex
                                            ].contractDetails = {
                                                _id: contract?._id,
                                                rateCode: contract?.rateCode,
                                                rateName: contract?.rateName,
                                            };
                                            roomPerDay.rooms[objIndex].rates[
                                                basePlanIndex
                                            ].contract = contract?._id;
                                            roomPerDay.rooms[objIndex].rates[
                                                basePlanIndex
                                            ].isSpecialRate = contract?.isSpecialRate;
                                            roomPerDay.rooms[objIndex].rates[
                                                basePlanIndex
                                            ].appliedRateCode = appliedRateCode;
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
                                                    boardTypesWithKeyVal[contract?.basePlan]
                                                        ?.boardName
                                                }`,
                                                boardName:
                                                    boardTypesWithKeyVal[contract?.basePlan]
                                                        ?.boardName,
                                                boardCode:
                                                    boardTypesWithKeyVal[contract?.basePlan]
                                                        ?.boardShortName,
                                                contractGroup: contract?.contractGroup?._id,
                                                contract: contract?._id,
                                                contractDetails: {
                                                    _id: contract?._id,
                                                    rateCode: contract?.rateCode,
                                                    rateName: contract?.rateName,
                                                },
                                                isSpecialRate: contract?.isSpecialRate,
                                                appliedRateCode,
                                                applyPromotion: contract?.applyPromotion,
                                                baseplan: contract?.basePlan,
                                                basePlanDetails: {
                                                    boardName:
                                                        boardTypesWithKeyVal[contract?.basePlan]
                                                            .boardName,
                                                    boardShortName:
                                                        boardTypesWithKeyVal[contract?.basePlan]
                                                            .boardShortName,
                                                },
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

                            const mealSupplements = contract.mealSupplements?.filter(
                                (item) =>
                                    moment(item?.fromDate).isSameOrBefore(date) &&
                                    moment(item?.toDate).isSameOrAfter(date) &&
                                    item?.roomTypes?.some(
                                        (roomTypeId) =>
                                            roomTypeId?.toString() === roomType?._id?.toString()
                                    )
                            );

                            if (
                                mealSupplements.length &&
                                boardTypesWithKeyVal[contract?.basePlan]
                            ) {
                                for (const mealSupplement of mealSupplements) {
                                    if (boardTypesWithKeyVal[mealSupplement?.boardType]) {
                                        let mealSupplementPrice =
                                            totalAdults * mealSupplement?.adultPrice +
                                            extrabedAppliedInfants * mealSupplement?.infantPrice +
                                            extrabedAppliedChildren * mealSupplement?.childPrice;

                                        if (mealSupplement?.childPrice > 0) {
                                            mealSupplementPrice += mealSupplement?.childPrice;
                                        }

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
                                                                mealSupplement?.boardType
                                                            ]?.boardShortName
                                                        }|`,
                                                        rateName: `${roomType?.roomName} with ${
                                                            boardTypesWithKeyVal[
                                                                mealSupplement?.boardType
                                                            ]?.displayName
                                                                ? boardTypesWithKeyVal[
                                                                      mealSupplement?.boardType
                                                                  ]?.displayName
                                                                : boardTypesWithKeyVal[
                                                                      mealSupplement?.boardType
                                                                  ]?.boardName
                                                        }`,
                                                        boardName:
                                                            boardTypesWithKeyVal[
                                                                mealSupplement?.boardType
                                                            ]?.boardName,
                                                        boardCode:
                                                            boardTypesWithKeyVal[
                                                                mealSupplement?.boardType
                                                            ]?.boardShortName,
                                                        contractGroup: contract?.contractGroup?._id,
                                                        contract: contract?._id,
                                                        contractDetails: {
                                                            _id: contract?._id,
                                                            rateCode: contract?.rateCode,
                                                            rateName: contract?.rateName,
                                                        },
                                                        isSpecialRate: contract?.isSpecialRate,
                                                        appliedRateCode,
                                                        applyPromotion: contract?.applyPromotion,
                                                        basePlan: contract?.basePlan,
                                                        basePlanDetails: {
                                                            boardName:
                                                                boardTypesWithKeyVal[
                                                                    contract?.basePlan
                                                                ].boardName,
                                                            boardShortName:
                                                                boardTypesWithKeyVal[
                                                                    contract?.basePlan
                                                                ].boardShortName,
                                                        },
                                                        priority: contract?.priority,
                                                        selectedRoomOccupancies,
                                                        mealSupplement: {
                                                            _id: mealSupplement?.boardType,
                                                            mealSupplementName:
                                                                boardTypesWithKeyVal[
                                                                    mealSupplement?.boardType
                                                                ]?.boardName,
                                                            mealSupplementShortName:
                                                                boardTypesWithKeyVal[
                                                                    mealSupplement?.boardType
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
                                            ]?.rates?.findIndex(
                                                (obj) =>
                                                    obj?.basePlan?.toString() ===
                                                        contract?.basePlan?.toString() &&
                                                    obj?.mealSupplement?._id?.toString() ===
                                                        mealSupplement?.boardType?.toString()
                                            );

                                            if (basePlanIndex === -1) {
                                                roomPerDay?.rooms[objIndex]?.rates?.push({
                                                    rateKey: `TCTT|${fromDate}|${toDate}|${hotelId}|${
                                                        roomType?._id
                                                    }|${
                                                        boardTypesWithKeyVal[contract?.basePlan]
                                                            ?.boardShortName
                                                    }|${
                                                        boardTypesWithKeyVal[
                                                            mealSupplement?.boardType
                                                        ]?.boardShortName
                                                    }|`,
                                                    rateName: `${roomType?.roomName} with ${
                                                        boardTypesWithKeyVal[
                                                            mealSupplement?.boardType
                                                        ]?.boardName
                                                    }`,
                                                    boardName:
                                                        boardTypesWithKeyVal[
                                                            mealSupplement?.boardType
                                                        ]?.boardName,
                                                    boardCode:
                                                        boardTypesWithKeyVal[
                                                            mealSupplement?.boardType
                                                        ]?.boardShortName,
                                                    contractGroup: contract?.contractGroup?._id,
                                                    contract: contract?._id,
                                                    contractDetails: {
                                                        _id: contract?._id,
                                                        rateCode: contract?.rateCode,
                                                        rateName: contract?.rateName,
                                                    },
                                                    isSpecialRate: contract?.isSpecialRate,
                                                    appliedRateCode,
                                                    applyPromotion: contract?.applyPromotion,
                                                    basePlan: contract?.basePlan,
                                                    basePlanDetails: {
                                                        boardName:
                                                            boardTypesWithKeyVal[contract?.basePlan]
                                                                .boardName,
                                                        boardShortName:
                                                            boardTypesWithKeyVal[contract?.basePlan]
                                                                .boardShortName,
                                                    },
                                                    priority: contract?.priority,
                                                    selectedRoomOccupancies,
                                                    mealSupplement: {
                                                        _id: mealSupplement?.boardType,
                                                        mealSupplementName:
                                                            boardTypesWithKeyVal[
                                                                mealSupplement?.boardType
                                                            ]?.boardName,
                                                        mealSupplementShortName:
                                                            boardTypesWithKeyVal[
                                                                mealSupplement?.boardType
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
                                            } else {
                                                if (
                                                    roomPerDay?.rooms[objIndex]?.rates[
                                                        basePlanIndex
                                                    ]?.priority < contract?.priority
                                                ) {
                                                    (roomPerDay.rooms[objIndex].rates[
                                                        basePlanIndex
                                                    ].contractDetails = {
                                                        _id: contract?._id,
                                                        rateCode: contract?.rateCode,
                                                        rateName: contract?.rateName,
                                                    }),
                                                        (roomPerDay.rooms[objIndex].rates[
                                                            basePlanIndex
                                                        ].isSpecialRate = contract?.isSpecialRate);

                                                    roomPerDay.rooms[objIndex].rates[
                                                        basePlanIndex
                                                    ].appliedRateCode = appliedRateCode;
                                                    roomPerDay.rooms[objIndex].rates[
                                                        basePlanIndex
                                                    ].contract = contract?._id;
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
                                                    roomPerDay?.rooms[objIndex]?.rates[
                                                        basePlanIndex
                                                    ]?.priority === contract?.priority
                                                ) {
                                                    roomPerDay?.rooms[objIndex]?.rates?.push({
                                                        rateKey: `TCTT|${fromDate}|${toDate}|${hotelId}|${
                                                            roomType?._id
                                                        }|${
                                                            boardTypesWithKeyVal[contract?.basePlan]
                                                                ?.boardShortName
                                                        }|${
                                                            boardTypesWithKeyVal[
                                                                mealSupplement?.boardType
                                                            ]?.boardShortName
                                                        }|`,
                                                        rateName: `${roomType?.roomName} with ${
                                                            boardTypesWithKeyVal[
                                                                mealSupplement?.boardType
                                                            ]?.boardName
                                                        }`,
                                                        boardName:
                                                            boardTypesWithKeyVal[
                                                                mealSupplement?.boardType
                                                            ]?.boardName,
                                                        boardCode:
                                                            boardTypesWithKeyVal[
                                                                mealSupplement?.boardType
                                                            ]?.boardShortName,
                                                        contractGroup: contract?.contractGroup?._id,
                                                        contract: contract?._id,
                                                        contractDetails: {
                                                            _id: contract?._id,
                                                            rateCode: contract?.rateCode,
                                                            rateName: contract?.rateName,
                                                        },
                                                        isSpecialRate: contract?.isSpecialRate,
                                                        appliedRateCode,
                                                        applyPromotion: contract?.applyPromotion,
                                                        basePlan: contract?.basePlan,
                                                        basePlanDetails: {
                                                            boardName:
                                                                boardTypesWithKeyVal[
                                                                    contract?.basePlan
                                                                ].boardName,
                                                            boardShortName:
                                                                boardTypesWithKeyVal[
                                                                    contract?.basePlan
                                                                ].boardShortName,
                                                        },
                                                        priority: contract?.priority,
                                                        selectedRoomOccupancies,
                                                        mealSupplement: {
                                                            _id: mealSupplement?.boardType,
                                                            mealSupplementName:
                                                                boardTypesWithKeyVal[
                                                                    mealSupplement?.boardType
                                                                ]?.boardName,
                                                            mealSupplementShortName:
                                                                boardTypesWithKeyVal[
                                                                    mealSupplement?.boardType
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
        }

        return roomPerDay;
    } catch (error) {
        throw error;
    }
};

const combineMultipleDayHotelPricesSG = (promiseResponses) => {
    try {
        let resultRooms = [];
        for (let i = 0; i < promiseResponses[0].rooms?.length; i++) {
            const firstDate = promiseResponses[0]?.date;
            let obj = promiseResponses[0].rooms[i];
            let matched = true;

            // initializing contracts array on first object and putting date, and contract to it
            for (const rate of obj.rates) {
                rate.grossPrice = rate.netPrice;
                rate.addOnSupplementPrice = 0;
                rate.addOnSupplements = [];
                rate.contracts = [
                    {
                        date: firstDate,
                        contractGroup: rate.contractGroup,
                        contract: rate.contract,
                        contractDetails: rate.contractDetails,
                        mealSupplementPrice: rate.mealSupplementPrice,
                        extraBedSupplementPrice: rate.extraBedSupplementPrice,
                        childSupplementPrice: rate.childSupplementPrice,
                        roomPrice: rate.roomPrice,
                        netPrice: rate?.netPrice,
                        selectedRoomOccupancies:
                            JSON.parse(JSON.stringify(rate))?.selectedRoomOccupancies || [],
                        isSpecialRate: rate?.isSpecialRate,
                        appliedRateCode: rate?.appliedRateCode,
                        applyPromotion: rate?.applyPromotion,
                        isContractedRate: rate?.isContractedRate,
                    },
                ];
            }

            for (let j = 1; j < promiseResponses.length; j++) {
                const promiseRes = promiseResponses[j];
                let found = false;

                for (const room of promiseRes.rooms) {
                    if (room?.roomTypeId?.toString() === obj?.roomTypeId?.toString()) {
                        for (let l = 0; l < obj?.rates?.length; l++) {
                            const myRate = obj?.rates[l];
                            let rateFound = false;

                            // first check same contract price is available or not
                            // if available match with same contract
                            let isSameContract = room?.rates?.findIndex((rateObj) => {
                                return (
                                    rateObj?.contract?.toString() === myRate?.contract?.toString()
                                );
                            });

                            for (let m = 0; m < room?.rates?.length; m++) {
                                // matching each days base plans with another days baseplans
                                // there is different combinations with baseplan and mealSupplement
                                // myRate?.basePlan?.toString() ===
                                // room?.rates[m]?.basePlan?.toString() &&
                                // myRate?.boardCode ===
                                // room?.rates[m]?.boardCode?.toString()
                                // check this working or not
                                if (
                                    myRate?.basePlan?.toString() ===
                                        room?.rates[m]?.basePlan?.toString() &&
                                    myRate?.mealSupplement?._id?.toString() ===
                                        room?.rates[m]?.mealSupplement?._id?.toString() &&
                                    (isSameContract !== -1
                                        ? myRate?.contract?.toString() ===
                                          room?.rates[m]?.contract?.toString()
                                        : true)
                                ) {
                                    let occupancyMatch = true;
                                    for (
                                        let oc1 = 0;
                                        oc1 < myRate?.selectedRoomOccupancies?.length;
                                        oc1++
                                    ) {
                                        if (
                                            myRate?.selectedRoomOccupancies[oc1].roomKey ===
                                                room?.rates[m]?.selectedRoomOccupancies[oc1]
                                                    ?.roomKey &&
                                            myRate?.selectedRoomOccupancies[oc1]?.shortName ===
                                                room?.rates[m]?.selectedRoomOccupancies[oc1]
                                                    ?.shortName &&
                                            myRate?.selectedRoomOccupancies[oc1]
                                                ?.extraBedApplied ===
                                                room?.rates[m]?.selectedRoomOccupancies[oc1]
                                                    ?.extraBedApplied &&
                                            myRate?.selectedRoomOccupancies[oc1]?.rollBedApplied ===
                                                room?.rates[m]?.selectedRoomOccupancies[oc1]
                                                    ?.rollBedApplied
                                        ) {
                                            myRate.selectedRoomOccupancies[oc1].price +=
                                                room?.rates[m]?.selectedRoomOccupancies[oc1]?.price;
                                        } else {
                                            occupancyMatch = false;
                                        }
                                    }
                                    // combining multiple days prices to a single field
                                    if (occupancyMatch === true) {
                                        myRate.mealSupplementPrice +=
                                            room?.rates[m]?.mealSupplementPrice;
                                        myRate.extraBedSupplementPrice +=
                                            room?.rates[m]?.extraBedSupplementPrice;
                                        myRate.childSupplementPrice +=
                                            room?.rates[m]?.childSupplementPrice;
                                        myRate.roomPrice += room?.rates[m]?.roomPrice;
                                        myRate.netPrice += room?.rates[m]?.netPrice;
                                        myRate.grossPrice += room?.rates[m]?.netPrice;

                                        // allocation
                                        if (
                                            myRate.allocationType === "stop-sale" ||
                                            room?.rates[m]?.allocationType === "stop-sale"
                                        ) {
                                            myRate.allocationType = "stop-sale";
                                            myRate.availableAllocation = 0;
                                        } else if (
                                            myRate.availableAllocation >
                                            room?.rates[m]?.availableAllocation
                                        ) {
                                            myRate.availableAllocation =
                                                room?.rates[m]?.availableAllocation;
                                        }

                                        // add on
                                        myRate.mandatoryAddOnPrice +=
                                            room?.rates[m]?.mandatoryAddOnPrice;
                                        myRate.totalAddOnPrice += room?.rates[m]?.totalAddOnPrice;

                                        let myAddOns = [...myRate?.mandatoryAddOns];
                                        for (
                                            let ao = 0;
                                            ao < room?.rates[m]?.mandatoryAddOns?.length;
                                            ao++
                                        ) {
                                            // console.log(room?.rates[m]?.addOns);
                                            const addOnObjIndex = myAddOns?.findIndex((item) => {
                                                return (
                                                    item?.addOnId?.toString() ===
                                                    room?.rates[m]?.mandatoryAddOns[
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
                                                        room?.rates[m]?.mandatoryAddOns[ao]
                                                            ?.dates[0],
                                                    ],
                                                };
                                            } else {
                                                myAddOns = [
                                                    ...myAddOns,
                                                    room?.rates[m]?.mandatoryAddOns[ao],
                                                ];
                                            }
                                        }

                                        myRate.mandatoryAddOns = myAddOns;

                                        // pushing single days contracts to an array
                                        // each array contains date and contract field
                                        myRate.contracts.push({
                                            date: promiseRes?.date,
                                            contractGroup: room?.rates[m]?.contractGroup,
                                            contract: room?.rates[m]?.contract,
                                            contractDetails: room?.rates[m]?.contractDetails,
                                            mealSupplementPrice:
                                                room?.rates[m]?.mealSupplementPrice,
                                            extraBedSupplementPrice:
                                                room?.rates[m]?.extraBedSupplementPrice,
                                            childSupplementPrice:
                                                room?.rates[m]?.childSupplementPrice,
                                            roomPrice: room?.rates[m]?.roomPrice,
                                            netPrice: room?.rates[m]?.netPrice,
                                            selectedRoomOccupancies:
                                                room?.rates[m]?.selectedRoomOccupancies,
                                            isSpecialRate: room?.rates[m]?.isSpecialRate,
                                            appliedRateCode: room?.rates[m]?.appliedRateCode,
                                            applyPromotion: room?.rates[m]?.applyPromotion,
                                            isContractedRate: room?.rates[m]?.isContractedRate,
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
                let filteredObjRates = obj?.rates;
                resultRooms.push({
                    ...obj,
                    rates: filteredObjRates?.sort((a, b) => a?.netPrice - b?.netPrice),
                });
            }
        }

        return resultRooms;
    } catch (err) {
        console.log("combine", err);
        Promise.reject(err);
    }
};

const createCombinationWithAddOn = async (
    resultRooms,
    hotelId,
    fromDate,
    toDate,
    totalAdults,
    totalChildren,
    roomsCount,
    noOfNights,
    allAddOns = []
) => {
    try {
        const addOns = allAddOns?.filter(
            (addOn) =>
                addOn?.hotel?.toString() === hotelId?.toString() &&
                addOn?.isMandatory === false &&
                moment(addOn?.fromDate).isSameOrBefore(fromDate) &&
                moment(addOn?.toDate).isSameOrAfter(toDate)
        );

        // TODO
        // create combination with two or more extra addons
        for (const room of resultRooms) {
            const newRates = [];
            for (const myRate of room?.rates) {
                const mandAddOns = myRate?.mandatoryAddOns;
                const addOnsTxt = [];
                for (const mandAddOn of mandAddOns) {
                    addOnsTxt.push(
                        `${mandAddOn?.dates?.length} nights ${mandAddOn?.addOnName} added`
                    );
                }
                myRate.addOnsTxt = addOnsTxt;
                newRates.push(myRate);

                for (const addOn of addOns) {
                    if (
                        !addOn?.roomTypes?.some(
                            (item) => item?.toString() === room?.roomTypeId?.toString()
                        ) ||
                        !addOn?.boardTypes?.some(
                            (item) => item?.toString() === myRate?.basePlan?.toString()
                        )
                    ) {
                        continue;
                    }

                    let totalAddOnPrice = 0;
                    if (addOn?.applyOn === "pax") {
                        let adultAddOnPrice = addOn?.adultPrice * totalAdults * noOfNights;
                        let childAddOnPrice = addOn?.childPrice * totalChildren * noOfNights;
                        totalAddOnPrice = adultAddOnPrice + childAddOnPrice;
                    } else if (addOn?.applyOn === "room") {
                        totalAddOnPrice = addOn?.roomPrice * roomsCount * noOfNights;
                    } else {
                        throw new Error("something went wrong on supplement addons");
                    }

                    const newRate = {
                        ...myRate,
                        addOnSupplementPrice: totalAddOnPrice,
                        addOnSupplements: [addOn?._id],
                        totalAddOnPrice: myRate?.totalAddOnPrice + totalAddOnPrice,
                        netPrice: myRate?.netPrice + totalAddOnPrice,
                        grossPrice: myRate?.grossPrice + totalAddOnPrice,
                        addOnsTxt: [...myRate?.addOnsTxt, `all days ${addOn.addOnName} added`],
                    };
                    newRates.push(newRate);
                }
            }
            room.rates = newRates;
        }

        return resultRooms;
    } catch (err) {
        console.log("comb addon", err);
        throw err;
    }
};

const findRoomTypeMarkup = (strategy, hotelId, roomType) => {
    if (!strategy) return null;
    for (const hotel of strategy.hotel || []) {
        if (hotel.hotelId?.toString() === hotelId.toString()) {
            const roomTypeMarkup = hotel.roomTypes?.find(
                (rt) => rt.roomTypeId?.toString() === roomType.toString()
            );
            if (roomTypeMarkup) return roomTypeMarkup;
            break;
        }
    }
    return null;
};

const findStarCategoryMarkup = (strategy, starCategory) => {
    if (!strategy) return null;
    return strategy.starCategory?.find((sc) => sc.name === starCategory) || null;
};

const calculateMarkup = (markup, basePlanLength, currentNetPrice) => {
    if (!markup || isNaN(markup.markup)) return 0;
    return markup.markupType === "flat"
        ? markup.markup * basePlanLength
        : (currentNetPrice / 100) * markup.markup;
};

const addPromotionOnHotelPricesSG = async (
    availabilityDatas,
    bookBefore,
    roomTypesWithKeyVal,
    boardTypesWithKeyVal,
    fromDate,
    hotelId,
    allPromotions,
    hotelstarCategory,
    clientMarkups,
    clientStarCategoryMarkups,
    subAgentMarkups,
    subAgentStarCategoryMarkups,
    marketStrategy,
    profileMarkup,
    reseller
) => {
    try {
        for (const availabilityData of availabilityDatas) {
            const roomType = availabilityData?.roomType?._id;

            let marketMarkup =
                findRoomTypeMarkup(marketStrategy, hotelId, roomType) ||
                findStarCategoryMarkup(marketStrategy, hotelstarCategory);

            let b2bMarkup =
                findRoomTypeMarkup(profileMarkup, hotelId, roomType) ||
                findStarCategoryMarkup(profileMarkup, hotelstarCategory);

            let clientMarkup =
                clientMarkups?.find(
                    (item) => item?.roomTypeId?.toString() === roomType?.toString()
                ) || clientStarCategoryMarkups?.find((item) => item?.name === hotelstarCategory);

            let subAgentMarkup;
            if (reseller?.role === "sub-agent") {
                subAgentMarkup =
                    subAgentMarkups?.find(
                        (item) => item?.roomTypeId?.toString() === roomType?.toString()
                    ) ||
                    subAgentStarCategoryMarkups?.find((item) => item?.name === hotel?.starCategory);
            }

            for (let i = 0; i < availabilityData.rates.length; i++) {
                const rate = availabilityData.rates[i];
                const contractGroups = [];
                const basePlan = rate;
                // sorting multiple contracts of each base plan to single contracts array and
                // counting continues number Of nights in each contract.

                for (baseplanContract of basePlan.contracts) {
                    const objIndex = contractGroups?.findIndex((contract) => {
                        return (
                            contract?.contractGroup?.toString() ===
                            baseplanContract.contractGroup?.toString()
                        );
                    });
                    if (
                        baseplanContract?.applyPromotion === true &&
                        baseplanContract?.isContractedRate === false
                    ) {
                        if (objIndex === -1) {
                            contractGroups.push({
                                contractGroup: baseplanContract.contractGroup,
                                dates: [
                                    {
                                        date: baseplanContract.date,
                                        contract: baseplanContract.contract,
                                        isSpecialRate: baseplanContract.isSpecialRate,
                                        selectedRoomOccupancies:
                                            baseplanContract?.selectedRoomOccupancies || [],
                                    },
                                ],
                                noOfNights: 1,
                            });
                        } else {
                            contractGroups[objIndex].dates.push({
                                date: baseplanContract.date,
                                contract: baseplanContract.contract,
                                isSpecialRate: baseplanContract.isSpecialRate,
                                selectedRoomOccupancies: baseplanContract?.selectedRoomOccupancies,
                            });
                            contractGroups[objIndex].noOfNights += 1;
                        }
                    }
                }

                let cancellationPolicies = basePlan?.cancellationPolicies;
                let appliedPromotionCancellation = false;
                let appliedPromotionId = "";

                const appliedPromotionIds = {};
                let contractGroupIndex;
                let samePriorityPromotions = [];
                const promotionsWithCancellationType = getPromotionsWithCancellationType(
                    allPromotions,
                    fromDate,
                    roomType,
                    cancellationPolicies,
                    basePlan
                );
                let filteredPromotions = [];
                // create a loop that check one and

                for (let l = 0; l < contractGroups.length; l++) {
                    const today = moment().startOf("day");

                    const promotions = allPromotions?.filter(
                        (item) =>
                            item?.hotel?.toString() === hotelId?.toString() &&
                            item?.contractGroups?.some(
                                (contGroup) =>
                                    contGroup?.toString() ===
                                    contractGroups[l]?.contractGroup?.toString()
                            ) &&
                            moment(item?.bookingWindowFrom).isSameOrBefore(today) &&
                            moment(item?.bookingWindowTo).isSameOrAfter(today)
                    );
                    // run with each promotion and compare prize and append added promotion with contracts
                    const {
                        promotion,
                        appliedStayPays,
                        appliedMealUpgrades,
                        appliedRoomTypeUpgrades,
                        appliedPromotions,
                        appliedPromotions2,
                        stayPayOffer,
                        discountOffer,
                        appliedDiscounts,
                        totalOffer,
                    } = applyPromotion(
                        promotions,
                        contractGroups[l],
                        roomType,
                        bookBefore,
                        basePlan,
                        roomTypesWithKeyVal,
                        boardTypesWithKeyVal,
                        l === 0
                    );

                    // updating cancellation policies
                    if (
                        contractGroups[l].dates?.some((item) => item?.date === fromDate) &&
                        promotion
                    ) {
                        if (promotion?.cancellationPolicies?.length) {
                            const filteredCancellationPolicies =
                                promotion?.cancellationPolicies?.filter(
                                    (item) =>
                                        moment(item?.fromDate).isSameOrBefore(fromDate) &&
                                        moment(item?.toDate).isSameOrAfter(fromDate) &&
                                        item?.roomTypes?.some(
                                            (item) => item?.toString() === roomType?.toString()
                                        )
                                );

                            if (filteredCancellationPolicies?.length) {
                                appliedPromotionCancellation = true;
                                cancellationPolicies = filteredCancellationPolicies;
                            }
                        }
                    }

                    if (rate.netPrice - totalOffer < 0) {
                        rate.netPrice = 0;
                    } else {
                        rate.netPrice -= totalOffer;
                    }
                    if (rate.totalOffer) {
                        rate.totalOffer += totalOffer;
                    } else {
                        rate.totalOffer = totalOffer;
                    }
                    if (rate.stayPayOffer) {
                        rate.stayPayOffer += stayPayOffer;
                    } else {
                        rate.stayPayOffer = stayPayOffer;
                    }
                    if (rate.discountOffer) {
                        rate.discountOffer += discountOffer;
                    } else {
                        rate.discountOffer = discountOffer;
                    }
                    if (rate.promotions) {
                        rate.promotions?.push(...appliedPromotions);
                    } else {
                        rate.promotions = appliedPromotions;
                    }
                    if (rate.appliedPromotions) {
                        rate.appliedPromotions?.push(...appliedPromotions2);
                    } else {
                        rate.appliedPromotions = appliedPromotions2;
                    }
                    if (rate.appliedDiscounts) {
                        rate.appliedDiscounts?.push(...appliedDiscounts);
                    } else {
                        rate.appliedDiscounts = appliedDiscounts;
                    }
                    if (rate.appliedMealUpgrades) {
                        rate.appliedMealUpgrades?.push(...appliedMealUpgrades);
                    } else {
                        rate.appliedMealUpgrades = appliedMealUpgrades;
                    }
                    if (rate.appliedRoomTypeUpgrades) {
                        rate.appliedRoomTypeUpgrades?.push(...appliedRoomTypeUpgrades);
                    } else {
                        rate.appliedRoomTypeUpgrades = appliedRoomTypeUpgrades;
                    }
                    if (rate.appliedStayPays) {
                        rate.appliedStayPays?.push(...appliedStayPays);
                    } else {
                        rate.appliedStayPays = appliedStayPays;
                    }

                    if (promotion && totalOffer > 0) {
                        rate.isPromotionApplied = true;
                        samePriorityPromotions = promotions?.filter(
                            (prom) =>
                                prom?.priority === promotion?.priority &&
                                prom?._id !== promotion?._id
                        );
                        if (samePriorityPromotions && samePriorityPromotions.length) {
                            contractGroupIndex = l;
                            filteredPromotions = promotions;
                        }
                        appliedPromotionId = promotion?._id;
                    }
                }

                let currentNetPrice = basePlan.netPrice;

                const basePlanLength = basePlan?.contracts?.length || 0;

                const adminMarketMarkup = calculateMarkup(
                    marketMarkup,
                    basePlanLength,
                    currentNetPrice
                );
                currentNetPrice += adminMarketMarkup;

                const adminB2bMarkup = calculateMarkup(b2bMarkup, basePlanLength, currentNetPrice);
                currentNetPrice += adminB2bMarkup;

                const saMarkup = calculateMarkup(subAgentMarkup, basePlanLength, currentNetPrice);
                currentNetPrice += saMarkup;

                const clMarkup = calculateMarkup(clientMarkup, basePlanLength, currentNetPrice);
                currentNetPrice += clMarkup;

                rate.netPrice = currentNetPrice;
                rate.adminMarketMarkup = adminMarketMarkup;
                rate.adminB2bMarkup = adminB2bMarkup;
                rate.subAgentMarkup = saMarkup;
                rate.clientMarkup = clMarkup;
                rate.grossPrice += adminMarketMarkup + adminB2bMarkup + saMarkup + clMarkup;

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

                        const daysBefore = policy?.daysBefore || 0;

                        let dateBy = moment(fromDate).subtract(daysBefore, "days");

                        if (dateBy.isBefore(moment())) {
                            dateBy = moment();
                        }
                        let formatedDateBy = formatDate(dateBy);

                        if (
                            cp === 0 &&
                            (dateBy > moment() || policy?.cancellationCharge === 0) &&
                            policy?.requestCancelDaysBefore
                        ) {
                            payLaterAvailable = true;
                            const requestDaysBefore = moment(fromDate).subtract(
                                policy?.requestCancelDaysBefore || 0,
                                "days"
                            );

                            lastDateForPayment = requestDaysBefore.isBefore(moment())
                                ? moment()
                                : requestDaysBefore;
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
                                from: moment(dateBy),
                                amount: 0,
                            });
                        } else if (policy?.cancellationChargeType === "percentage") {
                            allCancellationTypes.push("partially-refundable");
                            let cancellationCharge =
                                (currentNetPrice / 100) * policy?.cancellationCharge;
                            cancellationPoliciesTxt.push(
                                `If you cancel this booking on / after ${formatedDateBy} you will be charged ${cancellationCharge?.toFixed(
                                    2
                                )} AED.`
                            );
                            cancellationPoliciesList.push({
                                from: moment(dateBy),
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
                                from: moment(dateBy),
                                amount: cancellationCharge,
                            });
                        } else if (policy?.cancellationChargeType === "flat") {
                            allCancellationTypes.push("partially-refundable");
                            cancellationPoliciesTxt.push(
                                `If you cancel this booking on / after ${formatedDateBy} you will be charged ${policy?.cancellationCharge} AED.`
                            );
                            cancellationPoliciesList.push({
                                from: moment(dateBy),
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
                rate.rateKey += `${appliedPromotionId}|`;

                rate.cancellationType = cancellationType;
                // rate.cancellationPolicies = cancellationPoliciesTxt;
                rate.cancellationPoliciesTxt = cancellationPoliciesTxt;
                rate.cancellationPolicies = cancellationPoliciesList;
                rate.isApiConnected = false;
                rate.payLaterAvailable = payLaterAvailable;
                rate.lastDateForPayment = lastDateForPayment;

                rate.appliedPromotionCancellation = appliedPromotionCancellation;

                function isNumberValid(num) {
                    // Check if num is null or false
                    if (num === null || num === false) {
                        return false;
                    }
                    // Check if num is a number and not NaN
                    return typeof num === "number" && !isNaN(num);
                }

                if (
                    samePriorityPromotions &&
                    samePriorityPromotions?.length &&
                    isNumberValid(contractGroupIndex) &&
                    filteredPromotions?.length
                ) {
                    const CANCELLATION_TYPES = {
                        NonRefundable: ["refundable", "partiallyRefundable"],
                        Refundable: ["nonRefundable", "partiallyRefundable"],
                        PartiallyRefundable: ["refundable", "nonRefundable"],
                    };

                    if (cancellationType) {
                        const cancellationTypeWithoutSpace = cancellationType?.replaceAll(" ", "");
                        const cancellationTypes = CANCELLATION_TYPES[cancellationTypeWithoutSpace];
                        cancellationTypes.forEach((type) => {
                            const foundType = promotionsWithCancellationType[type]?.find((prom) => {
                                return samePriorityPromotions.some(
                                    (prom2) => prom?.priority === prom2?.priority
                                );
                            });

                            if (foundType) {
                                const {
                                    promotion,
                                    appliedStayPays,
                                    appliedMealUpgrades,
                                    appliedRoomTypeUpgrades,
                                    appliedPromotions,
                                    appliedPromotions2,
                                    stayPayOffer,
                                    discountOffer,
                                    appliedDiscounts,
                                    totalOffer,
                                } = applyPromotion(
                                    [foundType],
                                    contractGroups[contractGroupIndex],
                                    roomType,
                                    bookBefore,
                                    basePlan,
                                    roomTypesWithKeyVal,
                                    boardTypesWithKeyVal,
                                    contractGroupIndex === 0
                                );

                                if (
                                    contractGroups[contractGroupIndex].dates?.some(
                                        (item) => item?.date === fromDate
                                    ) &&
                                    promotion
                                ) {
                                    if (foundType?._id === promotion?._id) {
                                        const parentMarkup =
                                            adminMarketMarkup +
                                            adminB2bMarkup +
                                            saMarkup +
                                            clMarkup;
                                        const clonedRate = createCloneRate(
                                            totalOffer,
                                            foundType,
                                            appliedPromotions2,
                                            rate,
                                            appliedDiscounts,
                                            appliedMealUpgrades,
                                            appliedRoomTypeUpgrades,
                                            appliedStayPays,
                                            stayPayOffer,
                                            discountOffer,
                                            basePlan,
                                            parentMarkup,
                                            marketMarkup,
                                            b2bMarkup,
                                            subAgentMarkup,
                                            clientMarkup
                                        );

                                        insertAtPosition(availabilityData.rates, clonedRate, i + 1);
                                        i++;
                                    }
                                }
                            }
                        });
                    }
                }

                delete basePlan.contract;
                delete basePlan.basePlan;
                delete basePlan.priority;
                // delete basePlan.mealSupplement;
                // delete basePlan.mealSupplementPrice;
                // delete basePlan.extraBedSupplementPrice;
                // delete basePlan.childSupplementPrice;
                delete basePlan.mandatoryAddOns;
                // delete basePlan.mandatoryAddOnPrice;
                // delete basePlan.totalAddOnPrice;
                delete basePlan.allocationType;
                // delete basePlan.contracts;
                // delete basePlan.addOnSupplementPrice;
                delete basePlan.addOnSupplements;
            }

            function insertAtPosition(arr, element, position) {
                if (position > arr.length) {
                    throw new Error("Position out of range");
                }
                arr.splice(position, 0, element);
                return arr;
            }
        }

        function createCloneRate(
            totalOffer,
            foundRefundable,
            promotion,
            rate,
            appliedDiscounts,
            appliedMealUpgrades,
            appliedRoomTypeUpgrades,
            appliedStayPays,
            stayPayOffer,
            discountOffer,
            basePlan,
            parentMarkup,
            marketMarkup,
            b2bMarkup,
            subAgentMarkup,
            clientMarkup
        ) {
            const clonedRate = { ...rate };

            const parentOffer = rate?.totalOffer;
            clonedRate.netPrice = rate?.netPrice - parentMarkup + parentOffer;

            if (clonedRate.netPrice - totalOffer < 0) {
                clonedRate.netPrice = 0;
            } else {
                clonedRate.netPrice -= totalOffer;
            }
            clonedRate.totalOffer = totalOffer;

            let currentNetPrice = clonedRate.netPrice;
            let adminMarketMarkup = 0;
            if (marketMarkup && !isNaN(marketMarkup.markup)) {
                if (marketMarkup.markupType === "flat") {
                    adminMarketMarkup = marketMarkup.markup * basePlan?.contracts?.length; // multiplying to noof nights
                } else {
                    adminMarketMarkup = (currentNetPrice / 100) * marketMarkup.markup;
                }
            }
            currentNetPrice += adminMarketMarkup;

            let adminB2bMarkup = 0;
            if (b2bMarkup && !isNaN(b2bMarkup.markup)) {
                if (b2bMarkup.markupType === "flat") {
                    adminB2bMarkup = b2bMarkup.markup * basePlan?.contracts?.length; // multiplying to noof nights
                } else {
                    adminB2bMarkup = (currentNetPrice / 100) * b2bMarkup.markup;
                }
            }
            currentNetPrice += adminB2bMarkup;

            // agent to sub agent markup
            let saMarkup = 0;
            if (subAgentMarkup && !isNaN(subAgentMarkup.markup)) {
                if (subAgentMarkup.markupType === "flat") {
                    saMarkup = subAgentMarkup.markup * basePlan?.contracts?.length; // multiplying to noof nights
                } else {
                    saMarkup = (currentNetPrice / 100) * subAgentMarkup.markup;
                }
            }
            currentNetPrice += saMarkup;

            // agent to clinet markup
            let clMarkup = 0;
            if (clientMarkup && !isNaN(clientMarkup.markup)) {
                if (clientMarkup.markupType === "flat") {
                    clMarkup = clientMarkup.markup * basePlan?.contracts?.length; // multiplying to noof nights
                } else {
                    clMarkup = (currentNetPrice / 100) * clientMarkup.markup;
                }
            }
            currentNetPrice += clMarkup;

            clonedRate.netPrice = currentNetPrice;
            clonedRate.adminMarketMarkup = adminMarketMarkup;
            clonedRate.adminB2bMarkup = adminB2bMarkup;
            clonedRate.subAgentMarkup = saMarkup;
            clonedRate.clientMarkup = clMarkup;
            clonedRate.grossPrice =
                clonedRate.grossPrice -
                parentMarkup +
                adminMarketMarkup +
                adminB2bMarkup +
                saMarkup +
                clMarkup;

            clonedRate.stayPayOffer = stayPayOffer;
            clonedRate.discountOffer = discountOffer;

            clonedRate.appliedPromotions = promotion;

            clonedRate.cancellationType = foundRefundable?.cancellationType;
            clonedRate.cancellationPolicies = foundRefundable?.cancellationPoliciesList;
            rate.cancellationPoliciesTxt = foundRefundable?.cancellationPoliciesTxt;
            // rate.cancellationPolicies = cancellationPoliciesList;
            clonedRate.payLaterAvailable = foundRefundable?.payLaterAvailable;
            clonedRate.lastDateForPayment = foundRefundable?.lastDateForPayment;
            clonedRate.appliedPromotionCancellation = foundRefundable?.appliedPromotionCancellation;
            let newRateKey = clonedRate.rateKey.split("|"); // Step 1: Split the string by "|"
            newRateKey[10] = `${foundRefundable?._id}`;
            clonedRate.rateKey = newRateKey.join("|");
            clonedRate.isClonedRate = true;
            clonedRate.isPromotionApplied = true;
            clonedRate.parentRateKey = rate.rateKey;
            clonedRate.appliedDiscounts = appliedDiscounts;
            clonedRate.appliedMealUpgrades = appliedMealUpgrades;
            clonedRate.appliedMealUpgrades = appliedRoomTypeUpgrades = appliedRoomTypeUpgrades;
            clonedRate.appliedStayPays = appliedStayPays;
            return clonedRate;
        }

        return availabilityDatas;
    } catch (err) {
        console.log("addon", err);
        Promise.reject(err);
    }
};

const applyPromotion = (
    promotions,
    selectedContract,
    roomType,
    bookBefore,
    basePlan,
    roomTypesWithKeyVal,
    boardTypesWithKeyVal,
    isFirstIteration
) => {
    try {
        let allStayPays = []; // { promotion: {}, stayPays: [], combinedPromotions: [{ promotion: {}, stayPays: [] }] }
        let allMealUpgrades = []; // { promotion: {}, mealUpgrades: [], combinedPromotions: [{ promotion: {}, mealUpgrades: [] }] }
        let allRoomTypeUpgrades = []; // { promotion: {}, roomTypeUpgrades: [], combinedPromotions: [{ promotion: {}, roomTypeUpgrades: [] }] }
        let allDiscounts = []; // { promotion: {}, discounts: [], combinedPromotions: [{ promotion: {}, discounts: [] }] }
        const offersByDates = {};

        for (const promotion of promotions) {
            const tempStayPays = [];
            const tempMealUpgrades = [];
            const tempRoomTypeUpgrades = [];
            const tempDiscounts = [];

            const allTempStayPays = [];
            const allTempMealUpgrades = [];
            const allTempRoomTypeUpgrades = [];
            const allTempDiscounts = [];

            for (let qj = 0; qj < selectedContract.dates?.length; qj++) {
                const date = moment(selectedContract.dates[qj]?.date);
                const day = getDayName(date);

                let isDateExcluded = false;
                // checking date is excluded or not for applying promotion
                promotion?.excludedDates?.map((dateRange) => {
                    if (
                        moment(dateRange?.fromDate).isSameOrBefore(date) &&
                        moment(dateRange?.toDate).isSameOrAfter(date) &&
                        dateRange?.roomTypes?.some(
                            (rmType) => rmType?.toString() === roomType?.toString()
                        )
                    ) {
                        isDateExcluded = true;
                    }
                });

                const today = moment().startOf("day");

                const sellFrom = moment(promotion?.sellFrom);
                const sellTo = moment(promotion?.sellTo);
                const bookingWindowFrom = moment(promotion?.bookingWindowFrom);
                const bookingWindowTo = moment(promotion?.bookingWindowTo);
                const isValidDay = promotion?.validDays?.includes(day);

                const conditionsMet =
                    sellFrom.isSameOrBefore(date) &&
                    sellTo.isSameOrAfter(date) &&
                    bookingWindowFrom.isSameOrBefore(today) &&
                    bookingWindowTo.isSameOrAfter(today) &&
                    isValidDay &&
                    !isDateExcluded;

                if (
                    (selectedContract.dates[qj]?.isSpecialRate === true
                        ? promotion?.applicableOnRatePromotion === true
                        : true) &&
                    promotion?.contractGroups?.some(
                        (item) => item?.toString() === selectedContract?.contractGroup?.toString()
                    ) &&
                    conditionsMet
                ) {
                    if (promotion?.isStayPayAvailable === true) {
                        const stayPays = promotion?.stayPays?.filter(
                            (item) =>
                                moment(item?.fromDate).isSameOrBefore(date) &&
                                moment(item?.toDate).isSameOrAfter(date) &&
                                item?.roomTypes?.some(
                                    (item) => item?.toString() === roomType?.toString()
                                ) &&
                                item?.boardTypes?.some(
                                    (item) => item?.toString() === basePlan?.basePlan?.toString()
                                ) &&
                                item?.bookBefore <= bookBefore
                        );

                        if (stayPays?.length) {
                            stayPays.forEach((stayPay) => {
                                const objIndex = tempStayPays.findIndex(
                                    (item) => item?._id?.toString() === stayPay?._id?.toString()
                                );
                                if (objIndex === -1) {
                                    tempStayPays.push({
                                        ...stayPay,
                                        noOfNights: 1,
                                        dates: [date],
                                    });
                                } else {
                                    tempStayPays[objIndex].noOfNights++;
                                    tempStayPays[objIndex].dates?.push(date);
                                }
                            });
                        }
                    }

                    if (
                        promotion?.isMealUpgradeAvailable === true &&
                        basePlan?.mealSupplement?._id === ""
                    ) {
                        const mealUpgrades = promotion?.mealUpgrades?.filter((item) => {
                            return (
                                moment(item?.fromDate).isSameOrBefore(date) &&
                                moment(item?.toDate).isSameOrAfter(date) &&
                                item?.roomTypes?.some(
                                    (item) => item?.toString() === roomType?.toString()
                                ) &&
                                item?.bookBefore <= bookBefore &&
                                (promotion?.mealUpgradeOn === "both" &&
                                basePlan?.mealSupplement?._id
                                    ? item?.mealFrom?.toString() ===
                                      basePlan?.mealSupplement?._id?.toString()
                                    : item?.mealFrom?.toString() ===
                                      basePlan?.basePlan?._id?.toString()) &&
                                (promotion?.mealUpgradeOn === "extra-supplement"
                                    ? item?.mealFrom?.toString() ===
                                      basePlan?.mealSupplement?._id?.toString()
                                    : promotion?.mealUpgradeOn === "base-plan"
                                    ? item?.mealFrom?.toString() ===
                                      basePlan?.basePlan?._id?.toString()
                                    : true)
                            );
                        });

                        if (mealUpgrades?.length) {
                            mealUpgrades.forEach((mealUpgrade) => {
                                const objIndex = tempMealUpgrades.findIndex(
                                    (item) => item?._id?.toString() === mealUpgrade?._id?.toString()
                                );
                                if (objIndex === -1) {
                                    tempMealUpgrades.push({
                                        ...mealUpgrade,
                                        noOfNights: 1,
                                        dates: [date],
                                    });
                                } else {
                                    tempMealUpgrades[objIndex].noOfNights++;
                                    tempMealUpgrades[objIndex].dates?.push(date);
                                }
                            });
                        }
                    }

                    if (promotion?.isRoomTypeUpgradeAvailable === true) {
                        const roomTypeUpgrades = promotion?.roomTypeUpgrades?.filter(
                            (item) =>
                                moment(item?.fromDate).isSameOrBefore(date) &&
                                moment(item?.toDate).isSameOrAfter(date) &&
                                item?.bookBefore <= bookBefore &&
                                item?.boardTypes?.some(
                                    (item) => item?.toString() === basePlan?.basePlan?.toString()
                                ) &&
                                item?.roomTypeFrom?.toString() === roomType?.toString()
                        );

                        if (roomTypeUpgrades?.length) {
                            roomTypeUpgrades.forEach((roomTypeUpgrade) => {
                                const objIndex = tempRoomTypeUpgrades.findIndex(
                                    (item) =>
                                        item?._id?.toString() === roomTypeUpgrade?._id?.toString()
                                );
                                if (objIndex === -1) {
                                    tempRoomTypeUpgrades.push({
                                        ...roomTypeUpgrade,
                                        noOfNights: 1,
                                        dates: [date],
                                    });
                                } else {
                                    tempRoomTypeUpgrades[objIndex].noOfNights++;
                                    tempRoomTypeUpgrades[objIndex].dates?.push(date);
                                }
                            });
                        }
                    }

                    if (promotion?.isDiscountAvailable === true) {
                        const discounts = promotion?.discounts?.filter(
                            (item) =>
                                moment(item?.fromDate).isSameOrBefore(date) &&
                                moment(item?.toDate).isSameOrAfter(date) &&
                                item?.roomTypes?.some(
                                    (item) => item?.roomTypeId?.toString() === roomType?.toString()
                                ) &&
                                item?.boardTypes?.some(
                                    (item) => item?.toString() === basePlan?.basePlan?.toString()
                                ) &&
                                item?.bookBefore <= bookBefore
                        );

                        if (discounts?.length) {
                            discounts.forEach((discount) => {
                                const objIndex = tempDiscounts.findIndex(
                                    (item) => item?._id?.toString() === discount?._id?.toString()
                                );
                                if (objIndex === -1) {
                                    tempDiscounts.push({
                                        ...discount,
                                        noOfNights: 1,
                                        dates: [
                                            {
                                                date,
                                                selectedRoomOccupancies:
                                                    selectedContract.dates[qj]
                                                        ?.selectedRoomOccupancies,
                                            },
                                        ],
                                    });
                                } else {
                                    tempDiscounts[objIndex].noOfNights++;
                                    tempDiscounts[objIndex].dates?.push({
                                        date,
                                        selectedRoomOccupancies:
                                            selectedContract.dates[qj]?.selectedRoomOccupancies,
                                    });
                                }
                            });
                        }
                    }

                    // check if it is last date or end of loop
                    if (qj === selectedContract.dates?.length - 1) {
                        // console.log("COMBINED PROMOTIONS", promotion?.combinedPromotions?.length);
                        if (
                            promotion?.isCombinedPromotion === true &&
                            promotion?.combinedPromotions?.length
                        ) {
                            for (let cp = 0; cp < promotion?.combinedPromotions?.length; cp++) {
                                const cPromo = promotion?.combinedPromotions[cp];
                                let compTempDiscounts = [];
                                let compTempMealUpgrades = [];
                                let compTempRoomTypeUpgrades = [];
                                let compTempStayPays = [];

                                for (let cm = 0; cm < selectedContract.dates?.length; cm++) {
                                    const date = selectedContract.dates[cm]?.date;
                                    const day = getDayName(date);

                                    const today = moment().startOf("day");

                                    if (
                                        (selectedContract.dates[cm]?.isSpecialRate
                                            ? cPromo?.applicableOnRatePromotion === true
                                            : true) &&
                                        cPromo?.contractGroups?.some(
                                            (item) =>
                                                item?.toString() ===
                                                selectedContract?.contractGroup?.toString()
                                        ) &&
                                        moment(cPromo?.sellFrom).isSameOrBefore(date) &&
                                        moment(cPromo?.sellTo).isSameOrAfter(date) &&
                                        moment(cPromo?.bookingWindowFrom).isSameOrBefore(today) &&
                                        moment(cPromo?.bookingWindowTo).isSameOrAfter(today) &&
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
                                                            moment(item?.fromDate).isSameOrBefore(
                                                                date
                                                            ) &&
                                                            moment(item?.toDate).isSameOrAfter(
                                                                date
                                                            ) &&
                                                            item?.roomTypes?.some(
                                                                (roomTypeItem) =>
                                                                    roomTypeItem?.toString() ===
                                                                    roomType?.toString()
                                                            ) &&
                                                            item?.boardTypes?.some(
                                                                (boardTypeItem) =>
                                                                    boardTypeItem?.toString() ===
                                                                    basePlan?.basePlan?.toString()
                                                            ) &&
                                                            item?.bookBefore <= bookBefore
                                                        );
                                                    }
                                                );

                                                if (stayPays?.length) {
                                                    stayPays.forEach((stayPay) => {
                                                        const objIndex = compTempStayPays.findIndex(
                                                            (item) =>
                                                                item?._id?.toString() ===
                                                                stayPay?._id?.toString()
                                                        );
                                                        if (objIndex === -1) {
                                                            compTempStayPays.push({
                                                                ...stayPay,
                                                                noOfNights: 1,
                                                                dates: [date],
                                                            });
                                                        } else {
                                                            compTempStayPays[objIndex].noOfNights++;
                                                            compTempStayPays[objIndex].dates?.push(
                                                                date
                                                            );
                                                        }
                                                    });
                                                }
                                            }
                                        }

                                        if (cPromo?.isMealUpgradeAvailable === true) {
                                            if (
                                                selectedContract.dates[qj]?.isSpecialRate === true
                                                    ? cPromo?.applicableOnRatePromotion === true
                                                    : true
                                            ) {
                                                const mealUpgrades = cPromo?.mealUpgrades?.filter(
                                                    (item) => {
                                                        return (
                                                            moment(item?.fromDate).isSameOrAfter(
                                                                date
                                                            ) &&
                                                            moment(item?.toDate).isSameOrAfter(
                                                                date
                                                            ) &&
                                                            item?.roomTypes?.some(
                                                                (item) =>
                                                                    item?.toString() ===
                                                                    roomType?.toString()
                                                            ) &&
                                                            item?.bookBefore <= bookBefore &&
                                                            (cPromo?.mealUpgradeOn === "both" &&
                                                            basePlan?.mealSupplement?._id
                                                                ? item?.mealFrom?.toString() ===
                                                                  basePlan?.mealSupplement?._id?.toString()
                                                                : item?.mealFrom?.toString() ===
                                                                  basePlan?.basePlan?._id?.toString()) &&
                                                            (cPromo?.mealUpgradeOn ===
                                                            "extra-supplement"
                                                                ? item?.mealFrom?.toString() ===
                                                                  basePlan?.mealSupplement?._id?.toString()
                                                                : cPromo?.mealUpgradeOn ===
                                                                  "base-plan"
                                                                ? item?.mealFrom?.toString() ===
                                                                  basePlan?.basePlan?._id?.toString()
                                                                : true)
                                                        );
                                                    }
                                                );

                                                if (mealUpgrades?.length) {
                                                    mealUpgrades.forEach((mealUpgrade) => {
                                                        const objIndex =
                                                            compTempMealUpgrades.findIndex(
                                                                (item) =>
                                                                    item?._id?.toString() ===
                                                                    mealUpgrade?._id?.toString()
                                                            );
                                                        if (objIndex === -1) {
                                                            compTempMealUpgrades.push({
                                                                ...mealUpgrade,
                                                                noOfNights: 1,
                                                                dates: [date],
                                                            });
                                                        } else {
                                                            compTempMealUpgrades[objIndex]
                                                                .noOfNights++;
                                                            compTempMealUpgrades[
                                                                objIndex
                                                            ].dates?.push(date);
                                                        }
                                                    });
                                                }
                                            }
                                        }

                                        if (cPromo?.isRoomTypeUpgradeAvailable === true) {
                                            if (
                                                selectedContract.dates[qj]?.isSpecialRate === true
                                                    ? cPromo?.applicableOnRatePromotion === true
                                                    : true
                                            ) {
                                                const roomTypeUpgrades =
                                                    cPromo?.roomTypeUpgrades?.filter((item) => {
                                                        return (
                                                            moment(item?.fromDate).isSameOrBefore(
                                                                date
                                                            ) &&
                                                            moment(item?.toDate).isSameOrAfter(
                                                                date
                                                            ) &&
                                                            item?.bookBefore <= bookBefore &&
                                                            item?.boardTypes?.some(
                                                                (item) =>
                                                                    item?.toString() ===
                                                                    basePlan?.basePlan?.toString()
                                                            ) &&
                                                            item?.roomTypeFrom?.toString() ===
                                                                roomType?.toString()
                                                        );
                                                    });

                                                if (roomTypeUpgrades?.length) {
                                                    roomTypeUpgrades.forEach((roomTypeUpgrade) => {
                                                        const objIndex =
                                                            compTempRoomTypeUpgrades.findIndex(
                                                                (item) =>
                                                                    item?._id?.toString() ===
                                                                    roomTypeUpgrade?._id?.toString()
                                                            );
                                                        if (objIndex === -1) {
                                                            compTempRoomTypeUpgrades.push({
                                                                ...roomTypeUpgrade,
                                                                noOfNights: 1,
                                                                dates: [date],
                                                            });
                                                        } else {
                                                            compTempRoomTypeUpgrades[objIndex]
                                                                .noOfNights++;
                                                            compTempRoomTypeUpgrades[
                                                                objIndex
                                                            ].dates?.push(date);
                                                        }
                                                    });
                                                }
                                            }
                                        }

                                        if (cPromo?.isDiscountAvailable === true) {
                                            const discounts = cPromo?.discounts?.filter(
                                                item(
                                                    moment(item?.fromDate).isSameOrBefore(date) &&
                                                        moment(item?.toDate).isSameOrAfter(date) &&
                                                        item?.roomTypes?.some(
                                                            (item) =>
                                                                item?.roomTypeId?.toString() ===
                                                                roomType?.toString()
                                                        ) &&
                                                        item?.boardTypes?.some(
                                                            (item) =>
                                                                item?.toString() ===
                                                                basePlan?.basePlan?.toString()
                                                        ) &&
                                                        item?.bookBefore <= bookBefore
                                                )
                                            );

                                            if (discounts?.length) {
                                                discounts.forEach((discount) => {
                                                    const objIndex = compTempDiscounts.findIndex(
                                                        (item) =>
                                                            item?._id?.toString() ===
                                                            discount?._id?.toString()
                                                    );
                                                    if (objIndex === -1) {
                                                        compTempDiscounts.push({
                                                            ...discount,
                                                            noOfNights: 1,
                                                            dates: [
                                                                {
                                                                    date,
                                                                    selectedRoomOccupancies:
                                                                        selectedContract.dates[cm]
                                                                            ?.selectedRoomOccupancies,
                                                                },
                                                            ],
                                                        });
                                                    } else {
                                                        compTempDiscounts[objIndex].noOfNights++;
                                                        compTempDiscounts[objIndex].dates?.push({
                                                            date,
                                                            selectedRoomOccupancies:
                                                                selectedContract.dates[cm]
                                                                    ?.selectedRoomOccupancies,
                                                        });
                                                    }
                                                });
                                            }
                                        }
                                    }
                                }

                                if (compTempStayPays?.length) {
                                    allTempStayPays?.push({
                                        promotion: cPromo,
                                        stayPays: compTempStayPays,
                                    });
                                }
                                if (compTempMealUpgrades?.length) {
                                    allTempMealUpgrades?.push({
                                        promotion: cPromo,
                                        mealUpgrades: compTempMealUpgrades,
                                    });
                                }
                                if (compTempRoomTypeUpgrades?.length) {
                                    allTempRoomTypeUpgrades?.push({
                                        promotion: cPromo,
                                        roomTypeUpgrades: compTempRoomTypeUpgrades,
                                    });
                                }
                                if (compTempDiscounts?.length) {
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

            if (tempStayPays.length) {
                allStayPays.push({
                    promotion,
                    stayPays: tempStayPays,
                    combinedPromotions: allTempStayPays,
                });
            }
            if (tempMealUpgrades.length) {
                allMealUpgrades.push({
                    promotion,
                    mealUpgrades: tempMealUpgrades,
                    combinedPromotions: allTempMealUpgrades,
                });
            }
            if (tempRoomTypeUpgrades.length) {
                allRoomTypeUpgrades.push({
                    promotion,
                    roomTypeUpgrades: tempRoomTypeUpgrades,
                    combinedPromotions: allTempRoomTypeUpgrades,
                });
            }
            if (tempDiscounts?.length) {
                allDiscounts?.push({
                    promotion,
                    discounts: tempDiscounts,
                    combinedPromotions: allTempDiscounts,
                });
            }
        }

        let stayPayOffer = 0;
        let appliedStayPays = []; // [{ promotion: "", rateCode: "", dates: [], discount: "" }]
        const appliedStayPayDates = [];

        const applyStayPayOnEachItem = ({ filteredStayPays, staypayPromotion }) => {
            try {
                const tempAppliedStayPayDates = [];
                while (true) {
                    let isOneTimeFlag = false;
                    for (const filteredStayPay of filteredStayPays) {
                        if (
                            appliedStayPayDates?.some((date) =>
                                filteredStayPay.dates?.includes(date)
                            )
                        ) {
                            continue;
                        }
                        if (filteredStayPay?.noOfNights >= filteredStayPay?.stayCount) {
                            let tempIndex = -1;
                            if (staypayPromotion?.stayPayFreeOn === "last-night") {
                                tempIndex = basePlan.contracts?.findIndex((item) => {
                                    return (
                                        item?.date ===
                                        filteredStayPay.dates[filteredStayPay.dates?.length - 1]
                                    );
                                });
                            } else {
                                tempIndex = basePlan.contracts?.findIndex((item) => {
                                    return item?.date === filteredStayPay.dates[0];
                                });
                            }
                            if (tempIndex !== -1) {
                                let tempValue = basePlan.contracts[tempIndex].roomPrice;
                                let selectedDate = basePlan.contracts[tempIndex].date;
                                for (let ad = 0; ad < basePlan.contracts?.length; ad++) {
                                    if (staypayPromotion?.stayPayFreeOn === "cheapest") {
                                        if (
                                            tempValue < basePlan.contracts[ad].roomPrice &&
                                            filteredStayPay.dates?.includes(
                                                basePlan.contracts[ad]?.date
                                            )
                                        ) {
                                            tempValue = basePlan.contracts[ad].roomPrice;
                                            selectedDate = basePlan.contracts[ad].date;
                                            tempIndex = ad;
                                        }
                                    } else if (staypayPromotion?.stayPayFreeOn === "highest") {
                                        if (
                                            tempValue > basePlan.contracts[ad].roomPrice &&
                                            filteredStayPay.dates?.includes(
                                                basePlan.contracts[ad]?.date
                                            )
                                        ) {
                                            tempValue = basePlan.contracts[ad].roomPrice;
                                            selectedDate = basePlan.contracts[ad].date;
                                            tempIndex = ad;
                                        }
                                    }
                                }
                                stayPayOffer += tempValue;
                                filteredStayPay.noOfNights -= filteredStayPay?.stayCount;
                                appliedStayPays.push({
                                    promotion: {
                                        _id: staypayPromotion?._id,
                                        name: staypayPromotion?.name,
                                    },
                                    rateCode: filteredStayPay?.rateCode,
                                    dates: filteredStayPay?.dates,
                                    discount: tempValue,
                                });
                                tempAppliedStayPayDates.push(...filteredStayPay?.dates);
                                isOneTimeFlag = true;
                                if (offersByDates[selectedDate]) {
                                    offersByDates[selectedDate].stayPayOffer += tempValue;
                                } else {
                                    offersByDates[selectedDate] = {
                                        discountOffer: 0,
                                        stayPayOffer: tempValue,
                                    };
                                }
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

        if (allStayPays?.length) {
            for (const stayPay of allStayPays) {
                const staypayPromotion = stayPay?.promotion;
                const filteredStayPays = stayPay?.stayPays?.sort((a, b) => {
                    return b?.freeCount - a?.freeCount;
                });

                const { appliedDates } = applyStayPayOnEachItem({
                    filteredStayPays,
                    staypayPromotion,
                });

                appliedStayPayDates?.push(...appliedDates);

                for (const combinedPromotion of stayPay?.combinedPromotions) {
                    const staypayPromotion = combinedPromotion?.promotion;
                    const filteredStayPays = combinedPromotion?.stayPays?.sort((a, b) => {
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

        let appliedMealUpgrades = []; // [{ promotion: "", rateCode: "", dates: [], }]
        let uniqueMealUpgrades = [];
        let mealUpgradeTexts = [];
        let appliedMealDates = [];

        const applyMealUpgradeOnEachItem = ({ sortedMealUpgrades, mealUpgradePromotion }) => {
            try {
                for (const sortedMealUpgrade of sortedMealUpgrades) {
                    for (let ae = 0; ae < sortedMealUpgrade?.dates?.length; ae++) {
                        if (appliedMealDates?.includes(sortedMealUpgrade?.dates[ae])) {
                            sortedMealUpgrade?.dates?.splice(ae, 1);
                            sortedMealUpgrade.noOfNights -= 1;
                        }
                    }

                    if (
                        sortedMealUpgrade?.minimumLengthOfStay <= sortedMealUpgrade?.noOfNights &&
                        sortedMealUpgrade?.maximumLengthOfStay >= sortedMealUpgrade?.noOfNights
                    ) {
                        const uniqueMealUpgradeIndex = uniqueMealUpgrades?.findIndex((item) => {
                            return (
                                item?.mealTo?._id?.toString() ===
                                sortedMealUpgrade?.mealTo?._id?.toString()
                            );
                        });

                        if (uniqueMealUpgradeIndex === -1) {
                            uniqueMealUpgrades.push({
                                mealTo: sortedMealUpgrade?.mealTo,
                                dates: sortedMealUpgrade?.dates,
                            });
                        } else {
                            uniqueMealUpgrades[uniqueMealUpgradeIndex].mealTo =
                                sortedMealUpgrade?.mealTo;
                            uniqueMealUpgrades[uniqueMealUpgradeIndex]?.dates?.push(
                                ...sortedMealUpgrade.dates
                            );
                        }

                        appliedMealUpgrades.push({
                            promotion: {
                                _id: mealUpgradePromotion?._id,
                                name: mealUpgradePromotion?.name,
                            },
                            rateCode: sortedMealUpgrade?.rateCode,
                            dates: sortedMealUpgrade?.dates,
                            upgradedMeal: sortedMealUpgrade?.mealTo?._id,
                        });
                        appliedMealDates.push(...sortedMealUpgrade?.dates);
                    }
                }
            } catch (err) {
                throw err;
            }
        };

        if (allMealUpgrades?.length) {
            for (const mealUpgrade of allMealUpgrades) {
                const mealUpgradePromotion = mealUpgrade?.promotion;
                const sortedMealUpgrades = mealUpgrade?.mealUpgrades?.sort((a, b) => {
                    return b?.minimumLengthOfStay - a?.minimumLengthOfStay;
                });

                applyMealUpgradeOnEachItem({ sortedMealUpgrades, mealUpgradePromotion });

                for (const combinedPromotion of mealUpgrade?.combinedPromotions) {
                    const mealUpgradePromotion = combinedPromotion?.promotion;
                    const sortedMealUpgrades = combinedPromotion?.mealUpgrades?.sort((a, b) => {
                        return b?.minimumLengthOfStay - a?.minimumLengthOfStay;
                    });

                    applyMealUpgradeOnEachItem({ sortedMealUpgrades, mealUpgradePromotion });
                }
            }

            // ony for displaying on frontend
            for (const uniqueMealUpgrade of uniqueMealUpgrades) {
                if (boardTypesWithKeyVal[uniqueMealUpgrade?.mealTo]) {
                    mealUpgradeTexts.push(
                        `${uniqueMealUpgrade?.dates?.length} days meal upgraded to ${
                            boardTypesWithKeyVal[uniqueMealUpgrade?.mealTo]?.boardName
                        }. (${uniqueMealUpgrade?.dates?.toString()?.replace(",", ", ")})`
                    );
                }
            }
        }

        let appliedRoomTypeUpgrades = []; // [{ promotion: "", rateCode: "", dates: [] }]
        let uniqueRoomTypeUpgrades = [];
        let roomTypeUpgradeTexts = [];
        const appliedRoomTypeDates = [];

        const applyRoomTypeUpgradeOnEachItem = ({
            sortedRoomTypeUpgrades,
            roomTypeUpgradePromotion,
        }) => {
            try {
                for (const sortedRoomTypeUpgrade of sortedRoomTypeUpgrades) {
                    for (let ae = 0; ae < sortedRoomTypeUpgrade?.dates?.length; ae++) {
                        if (appliedRoomTypeDates?.includes(sortedRoomTypeUpgrade?.dates[ae])) {
                            sortedRoomTypeUpgrade?.dates?.splice(ae, 1);
                            sortedRoomTypeUpgrade.noOfNights -= 1;
                        }
                    }

                    if (
                        sortedRoomTypeUpgrade?.minimumLengthOfStay <=
                            sortedRoomTypeUpgrade?.noOfNights &&
                        sortedRoomTypeUpgrade?.maximumLengthOfStay >=
                            sortedRoomTypeUpgrade?.noOfNights
                    ) {
                        const uniqueMealUpgradeIndex = uniqueRoomTypeUpgrades?.findIndex((item) => {
                            return (
                                item?.roomTypeTo?._id?.toString() ===
                                sortedRoomTypeUpgrade?.roomTypeTo?._id?.toString()
                            );
                        });

                        if (uniqueMealUpgradeIndex === -1) {
                            uniqueRoomTypeUpgrades.push({
                                roomTypeTo: sortedRoomTypeUpgrade?.roomTypeTo,
                                dates: sortedRoomTypeUpgrade?.dates,
                            });
                        } else {
                            uniqueRoomTypeUpgrades[uniqueMealUpgradeIndex].roomTypeTo =
                                sortedRoomTypeUpgrade?.roomTypeTo;
                            uniqueRoomTypeUpgrades[uniqueMealUpgradeIndex]?.dates?.push(
                                ...sortedRoomTypeUpgrade.dates
                            );
                        }

                        appliedRoomTypeUpgrades.push({
                            promotion: {
                                _id: roomTypeUpgradePromotion?._id,
                                name: roomTypeUpgradePromotion?.name,
                            },
                            rateCode: sortedRoomTypeUpgrade?.rateCode,
                            dates: sortedRoomTypeUpgrade?.dates,
                            upgradedRoomType: sortedRoomTypeUpgrade?.roomTypeTo?._id,
                        });
                        appliedRoomTypeDates.push(...sortedRoomTypeUpgrade?.dates);
                    }
                }
            } catch (err) {
                throw err;
            }
        };

        if (allRoomTypeUpgrades?.length) {
            for (const allRoomTypeUpgrade of allRoomTypeUpgrades) {
                const roomTypeUpgradePromotion = allRoomTypeUpgrade?.promotion;
                const sortedRoomTypeUpgrades = allRoomTypeUpgrade?.roomTypeUpgrades?.sort(
                    (a, b) => {
                        return b?.minimumLengthOfStay - a?.minimumLengthOfStay;
                    }
                );

                applyRoomTypeUpgradeOnEachItem({
                    sortedRoomTypeUpgrades,
                    roomTypeUpgradePromotion,
                });

                for (const combinedPromotion of allRoomTypeUpgrade?.combinedPromotions) {
                    const roomTypeUpgradePromotion = combinedPromotion?.promotion;
                    const sortedRoomTypeUpgrades = combinedPromotion?.mealUpgrades?.sort((a, b) => {
                        return b?.minimumLengthOfStay - a?.minimumLengthOfStay;
                    });

                    applyRoomTypeUpgradeOnEachItem({
                        sortedRoomTypeUpgrades,
                        roomTypeUpgradePromotion,
                    });
                }
            }

            for (const uniqueRoomTypeUpgrade of uniqueRoomTypeUpgrades) {
                if (roomTypesWithKeyVal[uniqueRoomTypeUpgrade?.roomTypeTo]) {
                    roomTypeUpgradeTexts.push(
                        `${uniqueRoomTypeUpgrade?.dates?.length} days room type upgraded to ${
                            roomTypesWithKeyVal[uniqueRoomTypeUpgrade?.roomTypeTo]?.roomName
                        }. (${uniqueRoomTypeUpgrade?.dates?.toString()?.replace(",", ", ")})`
                    );
                }
            }
        }

        let appliedDiscounts = []; // [{ promotion: "", rateCode: "", dates: [], discount: 0 }]
        let discountOffer = 0;
        let appliedPromotions2 = [];

        const applyDiscountsOnEachItem = ({
            discountPromo,
            sortedDiscounts,
            appliedDiscountDates,
            applicableDates,
            isCombined,
        }) => {
            try {
                let tempAppliedDates = [];
                if (sortedDiscounts?.length) {
                    for (const sortedDiscount of sortedDiscounts) {
                        for (let ae = 0; ae < sortedDiscount?.dates?.length; ae++) {
                            appliedDiscountDates?.forEach((appliedDate) => {
                                if (moment(appliedDate).isSame(sortedDiscount?.dates[ae]?.date)) {
                                    sortedDiscount?.dates?.splice(ae, 1);
                                    sortedDiscount.noOfNights -= 1;
                                }
                            });
                        }

                        if (
                            sortedDiscount?.noOfNights >= sortedDiscount?.minimumLengthOfStay &&
                            sortedDiscount?.noOfNights <= sortedDiscount?.maximumLengthOfStay
                        ) {
                            for (const sortedDiscountDate of sortedDiscount?.dates) {
                                if (
                                    isCombined === true &&
                                    !applicableDates?.includes(sortedDiscountDate?.date)
                                ) {
                                    continue;
                                }

                                const a = moment(new Date("2024-05-24")).startOf("day");

                                const dateObjIndex = basePlan.contracts?.findIndex((item) => {
                                    return moment(new Date(item?.date))
                                        .startOf("day")
                                        .isSame(sortedDiscountDate?.date);
                                });
                                if (dateObjIndex !== -1) {
                                    for (
                                        let dx = 0;
                                        dx < sortedDiscountDate?.selectedRoomOccupancies?.length;
                                        dx++
                                    ) {
                                        const selectedRoomOccupancy =
                                            sortedDiscountDate?.selectedRoomOccupancies[dx];
                                        for (
                                            let sd = 0;
                                            sd < sortedDiscount?.roomTypes?.length;
                                            sd++
                                        ) {
                                            let disRoomType = sortedDiscount?.roomTypes[sd];
                                            if (
                                                disRoomType?.roomTypeId?.toString() ===
                                                roomType?.toString()
                                            ) {
                                                const occupancyObjIndex =
                                                    disRoomType?.roomOccupancies?.findIndex(
                                                        (item) => {
                                                            return (
                                                                item?.shortName ===
                                                                selectedRoomOccupancy?.shortName
                                                            );
                                                        }
                                                    );
                                                if (
                                                    occupancyObjIndex !== -1 &&
                                                    disRoomType?.roomOccupancies[occupancyObjIndex]
                                                        ?.discount
                                                ) {
                                                    let date = sortedDiscountDate?.date;
                                                    let appliedTempDiscount = 0;
                                                    if (sortedDiscount?.discountType === "flat") {
                                                        appliedTempDiscount +=
                                                            disRoomType?.roomOccupancies[
                                                                occupancyObjIndex
                                                            ]?.discount;

                                                        appliedPromotions2.push({
                                                            promotionName: discountPromo?.name,
                                                            rateCode: sortedDiscount?.rateCode,
                                                            discount:
                                                                disRoomType?.roomOccupancies[
                                                                    occupancyObjIndex
                                                                ]?.discount,
                                                            discountType:
                                                                sortedDiscount?.discountType,
                                                            occupancyType:
                                                                disRoomType?.roomOccupancies[
                                                                    occupancyObjIndex
                                                                ]?.shortName,
                                                        });
                                                    } else {
                                                        // TODO:
                                                        // update extrbed and mealsupplement calculation.
                                                        // if this is different for each occupancy then this fails
                                                        if (
                                                            discountPromo?.isApplicableForExtraBed ===
                                                                true &&
                                                            dx === 0
                                                        ) {
                                                            appliedTempDiscount +=
                                                                (disRoomType?.roomOccupancies[
                                                                    occupancyObjIndex
                                                                ]?.discount /
                                                                    100) *
                                                                basePlan.contracts[dateObjIndex]
                                                                    ?.extraBedSupplementPrice;
                                                        }
                                                        if (
                                                            discountPromo?.isApplicableForSupplement ===
                                                                true &&
                                                            dx === 0
                                                        ) {
                                                            appliedTempDiscount +=
                                                                (disRoomType?.roomOccupancies[
                                                                    occupancyObjIndex
                                                                ]?.discount /
                                                                    100) *
                                                                basePlan.contracts[dateObjIndex]
                                                                    ?.mealSupplementPrice;
                                                        }
                                                        if (
                                                            isFirstIteration === true &&
                                                            dx == 0 &&
                                                            basePlan?.totalAddOnPrice > 0 &&
                                                            discountPromo?.isApplicableForAddOn ===
                                                                true
                                                        ) {
                                                            appliedTempDiscount +=
                                                                (disRoomType?.roomOccupancies[
                                                                    occupancyObjIndex
                                                                ]?.discount /
                                                                    100) *
                                                                (basePlan?.totalAddOnPrice /
                                                                    sortedDiscount?.dates?.length); // need to change based on single date addOn adding
                                                        }
                                                        appliedTempDiscount +=
                                                            (disRoomType?.roomOccupancies[
                                                                occupancyObjIndex
                                                            ]?.discount /
                                                                100) *
                                                            selectedRoomOccupancy?.price;
                                                        appliedPromotions2.push({
                                                            promotionName: discountPromo?.name,
                                                            rateCode: sortedDiscount?.rateCode,
                                                            discount:
                                                                disRoomType?.roomOccupancies[
                                                                    occupancyObjIndex
                                                                ]?.discount,
                                                            discountType:
                                                                sortedDiscount?.discountType,
                                                            occupancyType:
                                                                disRoomType?.roomOccupancies[
                                                                    occupancyObjIndex
                                                                ]?.shortName,
                                                        });
                                                        // basePlan.contracts[dateObjIndex]
                                                        //     ?.roomPrice;
                                                    }
                                                    // adding these to applied promotions
                                                    discountOffer += appliedTempDiscount;
                                                    appliedDiscounts.push({
                                                        promotion: {
                                                            _id: discountPromo?._id,
                                                            name: discountPromo?.name,
                                                        },
                                                        rateCode: sortedDiscount?.rateCode,
                                                        dates: [date],
                                                        discount: appliedTempDiscount,
                                                    });
                                                    appliedDiscountDates.push(date);
                                                    tempAppliedDates.push(date);
                                                    if (offersByDates[date]) {
                                                        offersByDates[date].discountOffer +=
                                                            appliedTempDiscount;
                                                    } else {
                                                        offersByDates[date] = {
                                                            discountOffer: appliedTempDiscount,
                                                            stayPayOffer: 0,
                                                        };
                                                    }
                                                }

                                                break;
                                            }
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

        if (allDiscounts?.length) {
            const appliedDiscountDates = []; // ["10-12-2024", "10-12-2024"]

            for (const mainDiscount of allDiscounts) {
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
                    appliedDiscountDates,
                    applicableDates: [],
                    isCombined: false,
                });

                const appliedCombinedDiscountDates = []; // ["10-12-2024", "10-12-2024"]
                for (const combinedPromotion of mainDiscount?.combinedPromotions) {
                    let discountPromo = combinedPromotion?.promotion;

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
                        appliedDiscountDates: appliedCombinedDiscountDates,
                        applicableDates: appliedDates,
                        isCombined: true,
                    });
                }
            }
        }

        return {
            promotion: allDiscounts[0]?.promotion,
            appliedStayPays,
            appliedMealUpgrades,
            // uniqueMealUpgrades,
            appliedRoomTypeUpgrades,
            // uniqueRoomTypeUpgrades,
            appliedPromotions: [...mealUpgradeTexts, ...roomTypeUpgradeTexts],
            appliedPromotions2,
            stayPayOffer,
            discountOffer,
            appliedDiscounts,
            totalOffer: stayPayOffer + discountOffer,
            offersByDates,
        };
    } catch (err) {
        throw err;
    }
};

const getPromotionsWithCancellationType = (
    promotions,
    fromDate,
    roomType,
    contractCancellationPolicies,
    basePlan
) => {
    const result = {
        refundable: [],
        nonRefundable: [],
        partiallyRefundable: [],
    };

    const currentNetPrice = basePlan.netPrice;

    promotions.forEach((promotion, idx) => {
        let appliedPromotionCancellation = false;
        let cancellationPolicies = contractCancellationPolicies;
        if (promotion?.cancellationPolicies?.length) {
            const filteredCancellationPolicies = promotion?.cancellationPolicies?.filter(
                (item) =>
                    moment(item?.fromDate).isSameOrBefore(fromDate) &&
                    moment(item?.toDate).isSameOrAfter(fromDate) &&
                    item?.roomTypes?.some((item) => item?.toString() === roomType?.toString())
            );

            if (filteredCancellationPolicies?.length) {
                appliedPromotionCancellation = true;
                cancellationPolicies = filteredCancellationPolicies;
            }
        }

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

                const daysBefore = policy?.daysBefore || 0;

                let dateBy = moment(fromDate).subtract(daysBefore, "days");

                if (dateBy.isBefore(moment())) {
                    dateBy = moment();
                }
                let formatedDateBy = formatDate(dateBy);

                if (
                    cp === 0 &&
                    (dateBy > moment() || policy?.cancellationCharge === 0) &&
                    policy?.requestCancelDaysBefore
                ) {
                    payLaterAvailable = true;
                    const requestDaysBefore = moment(fromDate).subtract(
                        policy?.requestCancelDaysBefore || 0,
                        "days"
                    );

                    lastDateForPayment = requestDaysBefore.isBefore(moment())
                        ? moment()
                        : requestDaysBefore;
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
                        from: moment(dateBy),
                        amount: 0,
                    });
                } else if (policy?.cancellationChargeType === "percentage") {
                    allCancellationTypes.push("partially-refundable");
                    let cancellationCharge = (currentNetPrice / 100) * policy?.cancellationCharge;
                    cancellationPoliciesTxt.push(
                        `If you cancel this booking on / after ${formatedDateBy} you will be charged ${cancellationCharge?.toFixed(
                            2
                        )} AED.`
                    );
                    cancellationPoliciesList.push({
                        from: moment(dateBy),
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
                        from: moment(dateBy),
                        amount: cancellationCharge,
                    });
                } else if (policy?.cancellationChargeType === "flat") {
                    allCancellationTypes.push("partially-refundable");
                    cancellationPoliciesTxt.push(
                        `If you cancel this booking on / after ${formatedDateBy} you will be charged ${policy?.cancellationCharge} AED.`
                    );
                    cancellationPoliciesList.push({
                        from: moment(dateBy),
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

        if (cancellationType === "Non Refundable")
            result.nonRefundable.push({
                ...promotion,
                cancellationType,
                payLaterAvailable,
                lastDateForPayment,
                cancellationPoliciesList,
                cancellationPoliciesList,
                appliedPromotionCancellation,
            });
        else if (cancellationType === "Refundable")
            result.refundable.push({
                ...promotion,
                cancellationType,
                payLaterAvailable,
                lastDateForPayment,
                cancellationPoliciesList,
                cancellationPoliciesList,
                appliedPromotionCancellation,
            });
        else
            result.partiallyRefundable.push({
                ...promotion,
                cancellationType,
                payLaterAvailable,
                lastDateForPayment,
                cancellationPoliciesList,
                cancellationPoliciesList,
                appliedPromotionCancellation,
            });
    });

    return result;
};

module.exports = {
    fetchContractDatas,
    getContractRoomRates,
};
