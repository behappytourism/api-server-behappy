const { Types } = require("mongoose");

const {
    HotelContract,
    HotelAllocation,
    HotelBoardType,
    HotelPromotion,
    HotelAddOn,
    RoomType,
} = require("../../../models/hotel");
const { applySelectedAddOnSupplement } = require("./addOnSupplementHelpers");
const { applyPromotion } = require("./hotelPromotionHelpers");
const { getDayName, formatDate } = require("../../../utils");

const getSingleHotelBasePlanPriceORD = async ({
    fromDate,
    toDate,
    rooms,
    hotel,
    roomType,
    contracts,
    basePlanCode,
    mealSupplementCode,
    bookBefore,
    appliedPromotionIds,
    addOnSupplements,
    totalAdults,
    totalChildren,
    nationality,
}) => {
    try {
        let basePlan;
        let extraMealSupplement;
        let roomTypesWithKeyVal = {};
        let boardTypesWithKeyVal = {};
        const roomTypes = await RoomType.find({
            isDeleted: false,
            hotel: hotel?._id,
            isActive: true,
        });
        roomTypes?.forEach((rmType) => {
            roomTypesWithKeyVal[rmType?._id] = rmType;
        });
        const boardTypes = await HotelBoardType.find({ _id: hotel?.boardTypes });
        boardTypes?.forEach((brType) => {
            if (brType?.boardShortName === basePlanCode) {
                basePlan = brType?._id;
            }
            if (brType?.boardShortName === mealSupplementCode) {
                extraMealSupplement = brType?._id;
            }
            boardTypesWithKeyVal[brType?._id] = brType;
        });

        if (!basePlan) {
            throw new Error("Base plan not found");
        }

        if (mealSupplementCode && !extraMealSupplement) {
            throw new Error("Meal supplement not found");
        }

        const promises = [];
        for (let i = 0; i < contracts.length; i++) {
            response = getSingleContractPriceORD({
                contract: contracts[i],
                roomType,
                rooms,
                hotel,
                extraMealSupplement,
                basePlan,
                totalAdults,
                totalChildren,
                roomsCount: rooms?.length,
                boardTypesWithKeyVal,
                noOfNights: contracts?.length,
                prevDate: contracts[i - 1]?.date,
                fromDate,
                toDate,
                nationality,
            });
            promises.push(response);
        }

        const contractsWithRates = await Promise.all([...promises]);

        let grossPrice = 0;
        let netPrice = 0;
        let roomPrice = 0;
        let mealSupplementPrice = 0;
        let extraBedSupplementPrice = 0;
        let childSupplementPrice = 0;
        let mealSupplement;
        let mandatoryAddOnPrice = 0;
        let totalAddOnPrice = 0;
        let mandatoryAddOns = [];
        let addOnSupplementPrice = 0;
        let contractsWithPrice = [];
        let boardTypeId;
        let rateComments = [];
        let selectedRoomOccupancies = [];
        let isTourismFeeIncluded;
        let conCancellationPolicies = [];

        let occupancyMatch = true;
        for (let i = 0; i < contractsWithRates?.length; i++) {
            if (i > 0) {
                for (
                    let oc1 = 0;
                    oc1 < contractsWithRates[i]?.selectedRoomOccupancies?.length;
                    oc1++
                ) {
                    if (
                        selectedRoomOccupancies[oc1]?.roomKey ===
                            contractsWithRates[i]?.selectedRoomOccupancies[oc1]?.roomKey &&
                        selectedRoomOccupancies[oc1]?.shortName ===
                            contractsWithRates[i]?.selectedRoomOccupancies[oc1]?.shortName &&
                        selectedRoomOccupancies[oc1]?.extraBedApplied ===
                            contractsWithRates[i]?.selectedRoomOccupancies[oc1]?.extraBedApplied &&
                        selectedRoomOccupancies[oc1]?.rollBedApplied ===
                            contractsWithRates[i]?.selectedRoomOccupancies[oc1]?.rollBedApplied
                    ) {
                        selectedRoomOccupancies[oc1].price +=
                            contractsWithRates[i]?.selectedRoomOccupancies[oc1]?.price;
                    } else {
                        occupancyMatch = false;
                    }
                }
            } else {
                selectedRoomOccupancies = contractsWithRates[0]?.selectedRoomOccupancies;
            }

            mealSupplementPrice += contractsWithRates[i]?.mealSupplementPrice;
            extraBedSupplementPrice += contractsWithRates[i]?.extraBedSupplementPrice;
            childSupplementPrice += contractsWithRates[i]?.childSupplementPrice;
            grossPrice += contractsWithRates[i]?.grossPrice;
            netPrice += contractsWithRates[i]?.netPrice;
            roomPrice += contractsWithRates[i]?.roomPrice;

            contractsWithPrice.push({
                date: contractsWithRates[i]?.date,
                contractGroup: contractsWithRates[i]?.contractGroup,
                contract: contractsWithRates[i]?.contract,
                isSpecialRate: contractsWithRates[i]?.isSpecialRate,
                appliedRateCode: contractsWithRates[i]?.appliedRateCode,
                applyPromotion: contractsWithRates[i]?.applyPromotion,
                isContractedRate: contractsWithRates[i]?.isContractedRate,
                mealSupplementPrice: contractsWithRates[i]?.mealSupplementPrice,
                extraBedSupplementPrice: contractsWithRates[i]?.extraBedSupplementPrice,
                childSupplementPrice: contractsWithRates[i]?.childSupplementPrice,
                roomPrice: contractsWithRates[i]?.roomPrice,
                netPrice: contractsWithRates[i]?.netPrice,
                selectedRoomOccupancies:
                    JSON.parse(JSON.stringify(contractsWithRates[i]))?.selectedRoomOccupancies ||
                    [],
            });

            if (i === 0) {
                mealSupplement = contractsWithRates[i]?.mealSupplement;
                boardTypeId = contractsWithRates[i]?.boardTypeId;
                rateComments = contractsWithRates[i]?.rateComments;
                isTourismFeeIncluded = contractsWithRates[i]?.isTourismFeeIncluded;
                conCancellationPolicies = contractsWithRates[i]?.cancellationPolicies;
            }

            mandatoryAddOnPrice += contractsWithRates[i].mandatoryAddOnPrice;
            totalAddOnPrice += contractsWithRates[i].totalAddOnPrice;

            for (let ao = 0; ao < contractsWithRates[i].mandatoryAddOns?.length; ao++) {
                const addOnObjIndex = mandatoryAddOns?.findIndex((item) => {
                    return (
                        item?.addOnId?.toString() ===
                        contractsWithRates[i].mandatoryAddOns[ao]?.addOnId?.toString()
                    );
                });

                if (addOnObjIndex !== -1) {
                    mandatoryAddOns[addOnObjIndex] = {
                        ...mandatoryAddOns[addOnObjIndex],
                        dates: [
                            ...mandatoryAddOns[addOnObjIndex].dates,
                            contractsWithRates[i].mandatoryAddOns[ao]?.dates[0],
                        ],
                    };
                } else {
                    mandatoryAddOns = [
                        ...mandatoryAddOns,
                        contractsWithRates[i].mandatoryAddOns[ao],
                    ];
                }
            }
        }

        if (occupancyMatch === false) {
            throw new Error("room occupancy changed. Please search availability again");
        }

        if (addOnSupplements?.length > 0) {
            addOnSupplementPrice = await applySelectedAddOnSupplement({
                fromDate,
                toDate,
                hotelId: hotel?._id,
                roomTypeId: roomType?._id,
                boardType: basePlan,
                noOfNights: contracts?.length,
                roomsCount: rooms?.length,
                addOnSupplements,
                totalAdults,
                totalChildren,
            });

            totalAddOnPrice += addOnSupplementPrice;
            grossPrice += addOnSupplementPrice;
            netPrice += addOnSupplementPrice;
        }

        const {
            totalOffer,
            stayPayOffer,
            discountOffer,
            appliedStayPays,
            appliedPromotions,
            appliedMealUpgrades,
            appliedRoomTypeUpgrades,
            appliedDiscounts,
            cancellationPolicies,
            cancellationType,
            offersByDates,
            payLaterAvailable,
            lastDateForPayment,
        } = await applyPromotionOnORD({
            basePlan,
            contractsWithPrice,
            mealSupplement,
            roomType: roomType?._id,
            hotel,
            bookBefore,
            boardTypesWithKeyVal,
            roomTypesWithKeyVal,
            nationality,
            conCancellationPolicies,
            fromDate,
            netPrice,
        });

        if (netPrice - totalOffer < 0) {
            netPrice = 0;
        } else {
            netPrice -= totalOffer;
        }

        return {
            rateName: `${roomType?.roomName} with ${
                extraMealSupplement
                    ? boardTypesWithKeyVal[extraMealSupplement]?.boardName
                    : boardTypesWithKeyVal[basePlan]?.boardName
            }`,
            contractsWithPrice: contractsWithPrice?.map((item) => {
                const totalOffer =
                    offersByDates[item?.date]?.discountOffer +
                        offersByDates[item?.date]?.stayPayOffer || 0;
                return {
                    ...item,
                    offerAppliedPrice:
                        item?.netPrice - totalOffer < 0 ? 0 : item?.netPrice - totalOffer,
                };
            }),
            totalOffer,
            grossPrice,
            netPrice,
            mealSupplementPrice,
            extraBedSupplementPrice,
            childSupplementPrice,
            stayPayOffer,
            discountOffer,
            appliedStayPays,
            appliedPromotions,
            appliedMealUpgrades,
            appliedRoomTypeUpgrades,
            appliedDiscounts,
            mandatoryAddOnPrice,
            mandatoryAddOns,
            addOnSupplementPrice,
            addOnSupplements,
            totalAddOnPrice,
            roomPrice,
            extraMealSupplement,
            basePlan,
            boardTypeId,
            rateComments,
            selectedRoomOccupancies,
            isTourismFeeIncluded,
            cancellationPolicies,
            cancellationType,
            payLaterAvailable,
            lastDateForPayment,
        };
    } catch (err) {
        throw err;
    }
};

const getSingleContractPriceORD = async ({
    contract,
    rooms,
    hotel,
    roomType,
    extraMealSupplement,
    basePlan,
    totalAdults,
    totalChildren,
    roomsCount,
    boardTypesWithKeyVal,
    noOfNights,
    fromDate,
    toDate,
    prevDate,
    nationality,
}) => {
    try {
        const hotelId = hotel?._id;
        const day = getDayName(contract?.date);

        if (!hotel?.openDays?.includes(day)) {
            throw new Error("sorry this hotel is not available on " + day);
        }

        if (
            new Date(contract.date) < new Date(fromDate) ||
            new Date(contract.date) > new Date(toDate)
        ) {
            throw Error("please select valid dates");
        }

        if (
            prevDate &&
            new Date(new Date(prevDate).setDate(new Date(prevDate).getDate() + 1))
                .toISOString()
                ?.substring(0, 10) !== new Date(contract.date)?.toISOString()?.substring(0, 10)
        ) {
            throw new Error("please select valid dates");
        }

        const contractDetail = await HotelContract.findOne({
            _id: Types.ObjectId(contract?.contract),
            hotel: Types.ObjectId(hotelId),
            sellFrom: { $lte: new Date(contract?.date) },
            sellTo: { $gte: new Date(contract?.date) },
            isDeleted: false,
            basePlan,
            status: "approved",
            $or: [
                {
                    specificNations: true,
                    applicableNations: nationality?.toUpperCase(),
                    "applicableNations.0": { $exists: true },
                },
                { specificNations: false },
            ],
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

        let isDateExcluded = false;
        // checking date is excluded or not for applying contract
        contractDetail?.excludedDates?.map((dateRange) => {
            if (
                new Date(dateRange?.fromDate) <= new Date(contract?.date) &&
                new Date(dateRange?.toDate) >= new Date(contract?.date) &&
                dateRange?.roomTypes?.some(
                    (rmType) => rmType?.toString() === roomType?._id?.toString()
                )
            ) {
                isDateExcluded = true;
            }
        });

        if (!contractDetail || isDateExcluded === true) {
            throw new Error("contract details not found or not available");
        }

        if (contractDetail?.contractGroup?.isDeleted === true) {
            throw new Error("contract group not found");
        }

        const addOns = await HotelAddOn.find({
            hotel: hotelId,
            fromDate: { $lte: new Date(contract?.date) },
            toDate: { $gte: new Date(contract?.date) },
            isMandatory: true,
        }).lean();

        const allocation = await HotelAllocation.findOne({
            date: contract?.date,
            hotel: hotelId,
            roomType: roomType?._id,
            contractGroup: contractDetail?.contractGroup?._id,
        }).lean();
        if (!allocation || allocation?.allocationType === "stop-sale") {
            throw new Error("sorry, there is stop sale on selected date");
        }

        if (
            (allocation?.allocationType === "static" &&
                allocation?.bookedAllocations >= allocation.allocation) ||
            (allocation?.allocationType === "free-sale" && allocation?.bookedAllocations >= 99)
        ) {
            throw new Error("sorry, there is no allocation on selected date");
        }

        const date1 = new Date();
        const date2 = new Date(contract?.date);
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < allocation?.releaseDate) {
            throw new Error("sorry, there is no allocation on selected date");
        }

        let contractRate = {
            date: contract?.date,
            boardTypeId: "",
            basePlan,
            contractGroup: contractDetail?.contractGroup?._id,
            contract: contract?.contract,
            isSpecialRate: contractDetail?.isSpecialRate,
            appliedRateCode: "",
            applyPromotion: contractDetail?.applyPromotion,
            isContractedRate: allocation?.rateType === "contract-rate",
            mealSupplement: {
                _id: "",
                mealSupplementName: "",
                mealSupplementShortName: "",
            },
            mealSupplementPrice: 0,
            extraBedSupplementPrice: 0,
            childSupplementPrice: 0,
            roomPrice: 0,
            netPrice: 0,
            grossPrice: 0,
            mandatoryAddOnPrice: 0,
            totalAddOnPrice: 0,
            mandatoryAddOns: [],
            rateComments: [],
            cancellationPolicies: [],
        };

        const roomRates = contractDetail?.roomRates?.filter((item) => {
            return (
                new Date(item?.fromDate) <= new Date(contract?.date) &&
                new Date(item?.toDate) >= new Date(contract?.date) &&
                item?.minimumLengthOfStay <= noOfNights &&
                item?.maximumLengthOfStay >= noOfNights &&
                item?.validDays?.includes(day)
            );
        });

        const roomRate = roomRates && roomRates[0];

        if (!roomRate) {
            throw new Error("room rate not found");
        }

        const selectedRoomOccupancies = [];

        const roomTypeObjIndex = roomRate?.roomTypes?.findIndex((item) => {
            return item?.roomTypeId?.toString() === roomType?._id?.toString();
        });

        if (roomTypeObjIndex === -1) {
            throw new Error("no price found for selected room type");
        }

        const filteredRoomOccupancies = roomType?.roomOccupancies?.filter((item) => {
            return item?.isActive === true;
        });

        let extrabedAppliedChildren = 0;
        let extrabedAppliedInfants = 0;
        let extraBedSupplementPrice = 0;
        let childSupplementPrice = 0;
        let hrRoomType = roomRate?.roomTypes[roomTypeObjIndex];
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
                        let noOfChildren = Number(rooms[op]?.noOfChildren) - totalInfants;
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
                                noOfAdults + noOfChildren + noOfInfants > roomOccupancy?.maxCount)
                        ) {
                            continue;
                        }

                        if (
                            runType === "exbed" &&
                            (noOfAdults < combination?.adultCount ||
                                noOfAdults > combination?.adultCount + roomOccupancy?.extraBed ||
                                noOfChildren < combination?.childCount ||
                                noOfChildren > combination?.childCount + roomOccupancy?.extraBed ||
                                noOfInfants < combination?.infantCount ||
                                noOfInfants > combination?.infantCount + roomOccupancy?.extraBed ||
                                noOfAdults + noOfChildren + noOfInfants - roomOccupancy?.extraBed >
                                    roomOccupancy?.maxCount)
                        ) {
                            continue;
                        }

                        if (
                            runType === "rollbed" &&
                            (noOfAdults < combination?.adultCount ||
                                noOfAdults > combination?.adultCount + roomOccupancy?.rollBed ||
                                noOfChildren < combination?.childCount ||
                                noOfChildren > combination?.childCount + roomOccupancy?.rollBed ||
                                noOfInfants < combination?.infantCount ||
                                noOfInfants > combination?.infantCount + roomOccupancy?.rollBed ||
                                noOfAdults + noOfChildren + noOfInfants - roomOccupancy?.rollBed >
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
                            const filteredChildPolicies = contractDetail?.childPolicies?.filter(
                                (item) => {
                                    return (
                                        item?.roomTypes?.some(
                                            (item) => item?.toString() === roomType?._id?.toString()
                                        ) &&
                                        new Date(item?.fromDate) <= new Date(contract?.date) &&
                                        new Date(item?.toDate) >= new Date(contract?.date)
                                    );
                                }
                            );
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
                                        for (let pa = 0; pa < policiesArr?.length; pa++) {
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
                                                        tempInfantAges[ag] <= childPolicy?.toAge
                                                    ) {
                                                        if (
                                                            paxCount > 0 &&
                                                            noOfInfants > 0 &&
                                                            applicableInfants > 0
                                                        ) {
                                                            if (
                                                                policy?.beddingIclusive === true &&
                                                                policy?.mealInclusive === true
                                                            ) {
                                                                paxCount -= 1;
                                                                noOfInfants -= 1;
                                                                applicableInfants -= 1;
                                                                infantAges.splice(ag, 1);
                                                            } else if (
                                                                policy?.beddingIclusive === true &&
                                                                policy?.mealInclusive === false
                                                            ) {
                                                                paxCount -= 1;
                                                                noOfInfants -= 1;
                                                                applicableInfants -= 1;
                                                                infantAges.splice(ag, 1);
                                                                tempChdSupplementPrice +=
                                                                    policy?.mealCharge || 0;
                                                            } else if (
                                                                policy?.beddingIclusive === false &&
                                                                policy?.mealInclusive === true
                                                            ) {
                                                                paxCount -= 1;
                                                                noOfInfants -= 1;
                                                                applicableInfants -= 1;
                                                                infantAges.splice(ag, 1);
                                                                tempChdSupplementPrice +=
                                                                    policy?.beddingCharge || 0;
                                                            } else if (
                                                                policy?.beddingIclusive === false &&
                                                                policy?.mealInclusive === false
                                                            ) {
                                                                paxCount -= 1;
                                                                noOfInfants -= 1;
                                                                applicableInfants -= 1;
                                                                infantAges.splice(ag, 1);
                                                                tempChdSupplementPrice +=
                                                                    policy?.totalCharge || 0;
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
                                                        tempChildrenAges[ag] <= childPolicy?.toAge
                                                    ) {
                                                        if (
                                                            paxCount > 0 &&
                                                            noOfChildren > 0 &&
                                                            applicableChildren > 0
                                                        ) {
                                                            if (
                                                                policy?.beddingIclusive === true &&
                                                                policy?.mealInclusive === true
                                                            ) {
                                                                paxCount -= 1;
                                                                noOfChildren -= 1;
                                                                applicableChildren -= 1;
                                                                childrenAges.splice(ag, 1);
                                                            } else if (
                                                                policy?.beddingIclusive === true &&
                                                                policy?.mealInclusive === false
                                                            ) {
                                                                paxCount -= 1;
                                                                noOfChildren -= 1;
                                                                applicableChildren -= 1;
                                                                childrenAges.splice(ag, 1);
                                                                tempChdSupplementPrice +=
                                                                    policy?.mealCharge;
                                                            } else if (
                                                                policy?.beddingIclusive === false &&
                                                                policy?.mealInclusive === true
                                                            ) {
                                                                paxCount -= 1;
                                                                noOfChildren -= 1;
                                                                applicableChildren -= 1;
                                                                childrenAges.splice(ag, 1);
                                                                tempChdSupplementPrice +=
                                                                    policy?.beddingCharge;
                                                            } else if (
                                                                policy?.beddingIclusive === false &&
                                                                policy?.mealInclusive === false
                                                            ) {
                                                                paxCount -= 1;
                                                                noOfChildren -= 1;
                                                                applicableChildren -= 1;
                                                                childrenAges.splice(ag, 1);
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
                            (extraBedAdults > 0 || noOfChildren > 0 || noOfInfants > 0) &&
                            (totalExtraBeds > 0 || totalRollBeds > 0)
                        ) {
                            const filteredExtraSupplements =
                                contractDetail?.extraSupplements?.filter((item) => {
                                    return (
                                        item?.roomTypes?.some(
                                            (item) => item?.toString() === roomType?._id?.toString()
                                        ) &&
                                        new Date(item?.fromDate) <= new Date(contract?.date) &&
                                        new Date(item?.toDate) >= new Date(contract?.date)
                                    );
                                });

                            if (filteredExtraSupplements?.length > 0) {
                                const filteredExtraSupplement = filteredExtraSupplements[0];

                                const exbedAdultPrice =
                                    filteredExtraSupplement?.isMealIncluded === true
                                        ? filteredExtraSupplement?.extraBedAdultPrice
                                        : filteredExtraSupplement?.extraBedAdultPrice +
                                          (filteredExtraSupplement?.exbMealPriceAdult || 0);
                                const exbedChildPrice =
                                    filteredExtraSupplement?.isMealIncluded === true
                                        ? filteredExtraSupplement?.extraBedChildPrice
                                        : filteredExtraSupplement?.extraBedChildPrice +
                                          (filteredExtraSupplement?.exbMealPriceChild || 0);

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
                            const rateOccupancyIndex = hrRoomType?.roomOccupancies?.findIndex(
                                (item) => {
                                    return (
                                        item?.occupancyId?.toString() ===
                                        roomOccupancy?._id?.toString()
                                    );
                                }
                            );

                            if (
                                rateOccupancyIndex === -1 ||
                                !hrRoomType?.roomOccupancies[rateOccupancyIndex]?.price
                            ) {
                                continue;
                            }
                            contractRate.roomPrice +=
                                hrRoomType?.roomOccupancies[rateOccupancyIndex]?.price;
                            extraBedSupplementPrice += tempExBedSupplementPrice;
                            childSupplementPrice += tempChdSupplementPrice;

                            selectedRoomOccupancies.push({
                                roomKey: op + 1,
                                occupancyId: roomOccupancy?._id,
                                occupancyName:
                                    extraBedApplied === true && roomOccupancy?.displayName
                                        ? roomOccupancy?.displayName
                                        : roomOccupancy?.occupancyName,
                                shortName: roomOccupancy?.shortName,
                                count: 1,
                                price: hrRoomType?.roomOccupancies[rateOccupancyIndex]?.price,
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

        if (isError === true) {
            throw new Error("some error occured on hotel rates");
        }

        if (extraMealSupplement) {
            const mealSupplements = contractDetail?.mealSupplements?.filter((item) => {
                return (
                    item?.boardType?.toString() === extraMealSupplement?.toString() &&
                    new Date(item?.fromDate) <= new Date(contract?.date) &&
                    new Date(item?.toDate) >= new Date(contract?.date) &&
                    item?.roomTypes?.some((itm) => itm?.toString() === roomType?._id?.toString())
                );
            });

            const mealSupplement = mealSupplements && mealSupplements[0];

            if (!mealSupplement) {
                throw new Error("mealSupplement not found");
            }

            contractRate.mealSupplementPrice =
                totalAdults * mealSupplement?.adultPrice +
                extrabedAppliedChildren * mealSupplement?.childPrice +
                extrabedAppliedInfants * mealSupplement?.infantPrice;

            contractRate.mealSupplement = {
                _id: mealSupplement?.boardType,
                mealSupplementName: boardTypesWithKeyVal[mealSupplement?.boardType]?.boardName,
                mealSupplementShortName:
                    boardTypesWithKeyVal[mealSupplement?.boardType]?.boardShortName,
            };
        }

        let totalInfants = 0;
        for (let rm = 0; rm < rooms?.length; rm++) {
            for (let ca = 0; ca < rooms[rm]?.childrenAges?.length; ca++) {
                const age = Number(rooms[rm]?.childrenAges[ca]);
                if (age >= roomType?.infantAgeFrom && age <= roomType?.infantAgeTo) {
                    totalInfants++;
                }
            }
        }

        // Adding Mandatory AddOns
        const filteredAddOns = addOns.filter((item) => {
            return (
                item?.roomTypes?.some((item) => item?.toString() === roomType?._id?.toString()) &&
                item?.boardTypes?.some((item) => item?.toString() === basePlan?.toString())
            );
        });

        let sortedAddOns = [];
        let mandatoryAddOnPrice = 0;
        if (filteredAddOns?.length > 0) {
            sortedAddOns = filteredAddOns?.map((item) => {
                if (item?.applyOn === "pax") {
                    mandatoryAddOnPrice += item?.adultPrice * totalAdults;
                    mandatoryAddOnPrice += item?.childPrice * (totalChildren - totalInfants);
                    mandatoryAddOnPrice += item?.infantPrice * totalInfants;
                } else if (item?.applyOn === "room") {
                    mandatoryAddOnPrice += item?.roomPrice * roomsCount;
                } else {
                    throw new Error("something went wrong on mandatory addons");
                }

                return {
                    dates: [contract.date],
                    addOnId: item?._id,
                    addOnName: item?.addOnName,
                };
            });
        }

        let filteredCancellationPolicies = [];
        if (
            contractDetail?.cancellationPolicies?.length < 1 &&
            contractDetail.isSpecialRate === true &&
            contractDetail?.parentContract?.cancellationPolicies?.length > 0
        ) {
            filteredCancellationPolicies =
                contractDetail?.parentContract?.cancellationPolicies?.filter((item) => {
                    return (
                        new Date(item?.fromDate) <= new Date(contract?.date) &&
                        new Date(item?.toDate) >= new Date(contract?.date) &&
                        item?.roomTypes?.some(
                            (item) => item?.toString() === roomType?._id?.toString()
                        )
                    );
                });
        } else if (contractDetail?.cancellationPolicies?.length > 0) {
            filteredCancellationPolicies = contractDetail?.cancellationPolicies?.filter((item) => {
                return (
                    new Date(item?.fromDate) <= new Date(contract?.date) &&
                    new Date(item?.toDate) >= new Date(contract?.date) &&
                    item?.roomTypes?.some((item) => item?.toString() === roomType?._id?.toString())
                );
            });
        }

        if (
            !boardTypesWithKeyVal[basePlan] ||
            (extraMealSupplement && !boardTypesWithKeyVal[extraMealSupplement])
        ) {
            throw new Error("board type not found");
        }

        contractRate.mandatoryAddOnPrice = mandatoryAddOnPrice;
        contractRate.totalAddOnPrice = mandatoryAddOnPrice;
        contractRate.mandatoryAddOns = sortedAddOns;
        contractRate.extraBedSupplementPrice = extraBedSupplementPrice;
        contractRate.childSupplementPrice = childSupplementPrice;
        contractRate.netPrice =
            contractRate.roomPrice +
            contractRate.mealSupplementPrice +
            mandatoryAddOnPrice +
            extraBedSupplementPrice +
            childSupplementPrice;
        contractRate.grossPrice =
            contractRate.roomPrice +
            contractRate.mealSupplementPrice +
            mandatoryAddOnPrice +
            extraBedSupplementPrice +
            childSupplementPrice;
        contractRate.boardTypeId = extraMealSupplement
            ? boardTypesWithKeyVal[extraMealSupplement]?._id
            : boardTypesWithKeyVal[basePlan]?._id;
        contractRate.isTourismFeeIncluded = contractDetail.isTourismFeeIncluded;
        contractRate.rateComments = [
            contractDetail.isTourismFeeIncluded === true
                ? "price includes mandatory tourism fees."
                : "price excludes mandatory tourism fees and is payable directly at the hotel.",
        ];
        contractRate.selectedRoomOccupancies = selectedRoomOccupancies;
        contractRate.appliedRateCode = roomRate.rateCode;
        contractRate.cancellationPolicies = filteredCancellationPolicies;

        return contractRate;
    } catch (err) {
        throw err;
    }
};

const applyPromotionOnORD = async ({
    basePlan,
    contractsWithPrice,
    mealSupplement,
    roomType,
    hotel,
    bookBefore,
    boardTypesWithKeyVal,
    roomTypesWithKeyVal,
    nationality,
    conCancellationPolicies,
    fromDate,
    netPrice,
}) => {
    try {
        let returnData = {
            totalOffer: 0,
            stayPayOffer: 0,
            discountOffer: 0,
            appliedStayPays: [],
            appliedPromotions: [],
            appliedMealUpgrades: [],
            appliedRoomTypeUpgrades: [],
            appliedDiscounts: [],
            cancellationPolicies: conCancellationPolicies,
            offersByDates: {},
        };
        const contractGroups = [];
        // sorting multiple contracts of each base plan to single contracts array and
        // counting continues number Of nights in each contract.

        for (let k = 0; k < contractsWithPrice.length; k++) {
            const objIndex = contractGroups?.findIndex((contract) => {
                return (
                    contract?.contractGroup?.toString() ===
                    contractsWithPrice[k].contractGroup?.toString()
                );
            });
            if (
                contractsWithPrice[k].applyPromotion === true &&
                contractsWithPrice[k]?.isContractedRate === false
            ) {
                if (objIndex == -1) {
                    contractGroups.push({
                        contractGroup: contractsWithPrice[k].contractGroup,
                        dates: [
                            {
                                date: contractsWithPrice[k].date,
                                contract: contractsWithPrice[k].contract,
                                isSpecialRate: contractsWithPrice[k].isSpecialRate,
                                selectedRoomOccupancies:
                                    contractsWithPrice[k].selectedRoomOccupancies,
                            },
                        ],
                        noOfNights: 1,
                        // promotion: appliedPromotionIds[contractsWithPrice[k].contractGroup],
                    });
                } else {
                    contractGroups[objIndex].dates.push({
                        date: contractsWithPrice[k].date,
                        contract: contractsWithPrice[k].contract,
                        isSpecialRate: contractsWithPrice[k].isSpecialRate,
                        selectedRoomOccupancies: contractsWithPrice[k].selectedRoomOccupancies,
                    });
                    contractGroups[objIndex].noOfNights += 1;
                }
            }
        }

        // create a loop that check one and
        for (let l = 0; l < contractGroups.length; l++) {
            // check this promotion is priority high or not
            const promotions = await HotelPromotion.find({
                hotel,
                contractGroups: contractGroups[l]?.contractGroup,
                bookingWindowFrom: { $lte: new Date(new Date().setHours(0, 0, 0, 0)) },
                bookingWindowTo: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
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
                offersByDates,
            } = await applyPromotion({
                promotions,
                selectedContract: contractGroups[l],
                roomType,
                bookBefore,
                basePlan: {
                    basePlan,
                    contracts: contractsWithPrice,
                    mealSupplement,
                },
                boardTypesWithKeyVal,
                roomTypesWithKeyVal,
                isFirstIteration: l === 0,
            });

            if (contractGroups[l].dates?.includes(fromDate) && promotion) {
                if (promotion?.cancellationPolicies?.length > 0) {
                    const filteredCancellationPolicies = promotion?.cancellationPolicies?.filter(
                        (item) => {
                            return (
                                new Date(item?.fromDate) <= new Date(fromDate) &&
                                new Date(item?.toDate) >= new Date(fromDate) &&
                                item?.roomTypes?.some(
                                    (item) => item?.toString() === roomType?.toString()
                                )
                            );
                        }
                    );

                    if (filteredCancellationPolicies?.length > 0) {
                        returnData.cancellationPolicies = filteredCancellationPolicies;
                    }
                }
            }

            returnData.stayPayOffer += stayPayOffer;
            returnData.discountOffer += discountOffer;
            returnData.totalOffer += totalOffer;
            returnData.appliedStayPays?.push(...appliedStayPays);
            returnData.appliedPromotions?.push(...appliedPromotions);
            returnData.appliedMealUpgrades?.push(...appliedMealUpgrades);
            returnData.appliedRoomTypeUpgrades?.push(...appliedRoomTypeUpgrades);
            returnData.appliedDiscounts?.push(...appliedDiscounts);
            returnData.offersByDates = offersByDates;
        }

        let payableAmount = netPrice;
        if (payableAmount - returnData.totalOffer < 0) {
            payableAmount = 0;
        } else {
            payableAmount -= returnData.totalOffer;
        }

        let cancellationPolicies = [];
        let cancellationType = "Non Refundable";
        let allCancellationTypes = [];
        let payLaterAvailable = false;
        let lastDateForPayment;

        if (returnData.cancellationPolicies?.length < 1) {
            cancellationType = "Non Refundable";
            cancellationPolicies.push({
                from: new Date(new Date().setHours(0, 0, 0, 0)),
                amount: payableAmount,
            });
        } else {
            const sortedCancellationPolicies = returnData.cancellationPolicies?.sort((a, b) => {
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
                        : new Date(
                              new Date(fromDate).setDate(
                                  new Date(fromDate).getDate() - policy?.daysBefore
                              )
                          );

                if (
                    cp === 0 &&
                    (dateBy > new Date() || policy?.cancellationCharge === 0) &&
                    policy?.requestCancelDaysBefore
                ) {
                    payLaterAvailable = true;
                    const requestDaysBefore =
                        new Date(
                            new Date(fromDate).setDate(
                                new Date(fromDate).getDate() - policy?.requestCancelDaysBefore
                            )
                        ) < new Date()
                            ? new Date()
                            : new Date(fromDate).setDate(
                                  new Date(fromDate).getDate() - policy?.requestCancelDaysBefore
                              );
                    lastDateForPayment = new Date(requestDaysBefore);
                }

                if (
                    policy?.cancellationType === "non-refundable" ||
                    policy?.cancellationChargeType === "non-refundable"
                ) {
                    cancellationPolicies = [
                        {
                            from: dateBy,
                            amount: payableAmount,
                        },
                    ];
                    allCancellationTypes = [];
                    payLaterAvailable = false;
                    lastDateForPayment = null;
                    break;
                } else if (policy?.cancellationCharge === 0) {
                    allCancellationTypes.push("refundable");
                    cancellationPolicies.push({
                        from: new Date(dateBy),
                        amount: 0,
                    });
                } else if (policy?.cancellationChargeType === "percentage") {
                    if (policy?.cancellationCharge === 100) {
                        cancellationPolicies.push({
                            from: new Date(dateBy),
                            amount: payableAmount,
                        });
                        allCancellationTypes.push("non-refundable");
                    } else {
                        allCancellationTypes.push("partially-refundable");
                        cancellationPolicies.push({
                            from: new Date(dateBy),
                            amount: (payableAmount / 100) * policy?.cancellationCharge,
                        });
                    }
                } else if (policy?.cancellationChargeType === "night") {
                    cancellationPolicies.push({
                        from: new Date(dateBy),
                        amount: contractsWithPrice[0]?.netPrice,
                    });
                    allCancellationTypes.push("partially-refundable");
                } else if (policy?.cancellationChargeType === "flat") {
                    cancellationPolicies.push({
                        from: new Date(dateBy),
                        amount: policy?.cancellationCharge,
                    });
                    allCancellationTypes.push("partially-refundable");
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

        returnData.cancellationPolicies = cancellationPolicies;
        returnData.payLaterAvailable = payLaterAvailable;
        returnData.lastDateForPayment = lastDateForPayment;
        returnData.cancellationType = cancellationType;

        return returnData;
    } catch (err) {
        throw err;
    }
};

module.exports = {
    getSingleHotelBasePlanPriceORD,
};
