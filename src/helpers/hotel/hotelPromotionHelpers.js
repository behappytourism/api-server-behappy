const { getDayName } = require("../../utils");

const applyPromotion = ({
    promotions,
    selectedContract,
    roomType,
    bookBefore,
    basePlan,
    roomTypesWithKeyVal,
    boardTypesWithKeyVal,
}) => {
    try {
        let allStayPays = []; // { promotion: {}, stayPays: [], combinedPromotions: [{ promotion: {}, stayPays: [] }] }
        let allMealUpgrades = []; // { promotion: {}, mealUpgrades: [], combinedPromotions: [{ promotion: {}, mealUpgrades: [] }] }
        let allRoomTypeUpgrades = []; // { promotion: {}, roomTypeUpgrades: [], combinedPromotions: [{ promotion: {}, roomTypeUpgrades: [] }] }
        let allDiscounts = []; // { promotion: {}, discounts: [], combinedPromotions: [{ promotion: {}, discounts: [] }] }
        const offersByDates = {};

        for (let qi = 0; qi < promotions?.length; qi++) {
            const promotion = promotions[qi];
            const tempStayPays = [];
            const tempMealUpgrades = [];
            const tempRoomTypeUpgrades = [];
            const tempDiscounts = [];

            const allTempStayPays = [];
            const allTempMealUpgrades = [];
            const allTempRoomTypeUpgrades = [];
            const allTempDiscounts = [];

            for (let qj = 0; qj < selectedContract.dates?.length; qj++) {
                const date = selectedContract.dates[qj]?.date;
                const day = getDayName(date);

                let isDateExcluded = false;
                // checking date is excluded or not for applying promotion
                promotion?.excludedDates?.map((dateRange) => {
                    if (
                        new Date(dateRange?.fromDate) <= new Date(date) &&
                        new Date(dateRange?.toDate) >= new Date(date) &&
                        dateRange?.roomTypes?.some(
                            (rmType) => rmType?.toString() === roomType?.toString()
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
                                    (item) => item?.toString() === roomType?.toString()
                                ) &&
                                item?.boardTypes?.some(
                                    (item) => item?.toString() === basePlan?.basePlan?.toString()
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

                    if (promotion?.isMealUpgradeAvailable === true) {
                        const mealUpgrades = promotion?.mealUpgrades?.filter((item) => {
                            return (
                                new Date(item?.fromDate) <= new Date(date) &&
                                new Date(item?.toDate) >= new Date(date) &&
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

                        if (mealUpgrades?.length > 0) {
                            for (let ab = 0; ab < mealUpgrades.length; ab++) {
                                const objIndex = tempMealUpgrades.findIndex((item) => {
                                    return (
                                        item?._id?.toString() === mealUpgrades[ab]?._id?.toString()
                                    );
                                });
                                if (objIndex === -1) {
                                    tempMealUpgrades.push({
                                        ...mealUpgrades[ab],
                                        noOfNights: 1,
                                        dates: [date],
                                    });
                                } else {
                                    tempMealUpgrades[objIndex].noOfNights += 1;
                                    tempMealUpgrades[objIndex].dates?.push(date);
                                }
                            }
                        }
                    }

                    if (promotion?.isRoomTypeUpgradeAvailable === true) {
                        const roomTypeUpgrades = promotion?.roomTypeUpgrades?.filter((item) => {
                            return (
                                new Date(item?.fromDate) <= new Date(date) &&
                                new Date(item?.toDate) >= new Date(date) &&
                                item?.bookBefore <= bookBefore &&
                                item?.boardTypes?.some(
                                    (item) => item?.toString() === basePlan?.basePlan?.toString()
                                ) &&
                                item?.roomTypeFrom?.toString() === roomType?.toString()
                            );
                        });

                        if (roomTypeUpgrades?.length > 0) {
                            for (let ab = 0; ab < roomTypeUpgrades.length; ab++) {
                                const objIndex = tempRoomTypeUpgrades.findIndex((item) => {
                                    return (
                                        item?._id?.toString() ===
                                        roomTypeUpgrades[ab]?._id?.toString()
                                    );
                                });
                                if (objIndex === -1) {
                                    tempRoomTypeUpgrades.push({
                                        ...roomTypeUpgrades[ab],
                                        noOfNights: 1,
                                        dates: [date],
                                    });
                                } else {
                                    tempRoomTypeUpgrades[objIndex].noOfNights += 1;
                                    tempRoomTypeUpgrades[objIndex].dates?.push(date);
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
                                    (item) => item?.roomTypeId?.toString() === roomType?.toString()
                                ) &&
                                item?.boardTypes?.some(
                                    (item) => item?.toString() === basePlan?.basePlan?.toString()
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
                                    tempDiscounts[objIndex].noOfNights += 1;
                                    tempDiscounts[objIndex].dates?.push({
                                        date,
                                        selectedRoomOccupancies:
                                            selectedContract.dates[qj]?.selectedRoomOccupancies,
                                    });
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
                                let compTempMealUpgrades = [];
                                let compTempRoomTypeUpgrades = [];
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
                                                                    roomType?.toString()
                                                            ) &&
                                                            item?.boardTypes?.some(
                                                                (item) =>
                                                                    item?.toString() ===
                                                                    basePlan?.basePlan?.toString()
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

                                        if (cPromo?.isMealUpgradeAvailable === true) {
                                            if (
                                                selectedContract.dates[qj]?.isSpecialRate === true
                                                    ? cPromo?.applicableOnRatePromotion === true
                                                    : true
                                            ) {
                                                const mealUpgrades = cPromo?.mealUpgrades?.filter(
                                                    (item) => {
                                                        return (
                                                            new Date(item?.fromDate) <=
                                                                new Date(date) &&
                                                            new Date(item?.toDate) >=
                                                                new Date(date) &&
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

                                                if (mealUpgrades?.length > 0) {
                                                    for (
                                                        let ab = 0;
                                                        ab < mealUpgrades.length;
                                                        ab++
                                                    ) {
                                                        const objIndex =
                                                            compTempMealUpgrades.findIndex(
                                                                (item) => {
                                                                    return (
                                                                        item?._id?.toString() ===
                                                                        mealUpgrades[
                                                                            ab
                                                                        ]?._id?.toString()
                                                                    );
                                                                }
                                                            );
                                                        if (objIndex === -1) {
                                                            compTempMealUpgrades.push({
                                                                ...mealUpgrades[ab],
                                                                noOfNights: 1,
                                                                dates: [date],
                                                            });
                                                        } else {
                                                            compTempMealUpgrades[
                                                                objIndex
                                                            ].noOfNights += 1;
                                                            compTempMealUpgrades[
                                                                objIndex
                                                            ].dates?.push(date);
                                                        }
                                                    }
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
                                                            new Date(item?.fromDate) <=
                                                                new Date(date) &&
                                                            new Date(item?.toDate) >=
                                                                new Date(date) &&
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

                                                if (roomTypeUpgrades?.length > 0) {
                                                    for (
                                                        let ab = 0;
                                                        ab < roomTypeUpgrades.length;
                                                        ab++
                                                    ) {
                                                        const objIndex =
                                                            compTempRoomTypeUpgrades.findIndex(
                                                                (item) => {
                                                                    return (
                                                                        item?._id?.toString() ===
                                                                        roomTypeUpgrades[
                                                                            ab
                                                                        ]?._id?.toString()
                                                                    );
                                                                }
                                                            );
                                                        if (objIndex === -1) {
                                                            compTempRoomTypeUpgrades.push({
                                                                ...roomTypeUpgrades[ab],
                                                                noOfNights: 1,
                                                                dates: [date],
                                                            });
                                                        } else {
                                                            compTempRoomTypeUpgrades[
                                                                objIndex
                                                            ].noOfNights += 1;
                                                            compTempRoomTypeUpgrades[
                                                                objIndex
                                                            ].dates?.push(date);
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
                                                            roomType?.toString()
                                                    ) &&
                                                    item?.boardTypes?.some(
                                                        (item) =>
                                                            item?.toString() ===
                                                            basePlan?.basePlan?.toString()
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
                                                        compTempDiscounts[objIndex].noOfNights += 1;
                                                        compTempDiscounts[objIndex].dates?.push({
                                                            date,
                                                            selectedRoomOccupancies:
                                                                selectedContract.dates[cm]
                                                                    ?.selectedRoomOccupancies,
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
                                if (compTempMealUpgrades?.length > 0) {
                                    allTempMealUpgrades?.push({
                                        promotion: cPromo,
                                        mealUpgrades: compTempMealUpgrades,
                                    });
                                }
                                if (compTempRoomTypeUpgrades?.length > 0) {
                                    allTempRoomTypeUpgrades?.push({
                                        promotion: cPromo,
                                        roomTypeUpgrades: compTempRoomTypeUpgrades,
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
            if (tempMealUpgrades.length > 0) {
                allMealUpgrades.push({
                    promotion,
                    mealUpgrades: tempMealUpgrades,
                    combinedPromotions: allTempMealUpgrades,
                });
            }
            if (tempRoomTypeUpgrades.length > 0) {
                allRoomTypeUpgrades.push({
                    promotion,
                    roomTypeUpgrades: tempRoomTypeUpgrades,
                    combinedPromotions: allTempRoomTypeUpgrades,
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
        let appliedStayPays = []; // [{ promotion: "", rateCode: "", dates: [], discount: "" }]
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
                                tempIndex = basePlan.contracts?.findIndex((item) => {
                                    return (
                                        item?.date ===
                                        filteredStayPays[ac].dates[
                                            filteredStayPays[ac].dates?.length - 1
                                        ]
                                    );
                                });
                            } else {
                                tempIndex = basePlan.contracts?.findIndex((item) => {
                                    return item?.date === filteredStayPays[ac].dates[0];
                                });
                            }
                            if (tempIndex !== -1) {
                                let tempValue = basePlan.contracts[tempIndex].roomPrice;
                                let selectedDate = basePlan.contracts[tempIndex].date;
                                for (let ad = 0; ad < basePlan.contracts?.length; ad++) {
                                    if (staypayPromotion?.stayPayFreeOn === "cheapest") {
                                        if (
                                            tempValue < basePlan.contracts[ad].roomPrice &&
                                            filteredStayPays[ac].dates?.includes(
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
                                            filteredStayPays[ac].dates?.includes(
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
                                filteredStayPays[ac].noOfNights -= filteredStayPays[ac]?.stayCount;
                                appliedStayPays.push({
                                    promotion: staypayPromotion?._id,
                                    rateCode: filteredStayPays[ac]?.rateCode,
                                    dates: filteredStayPays[ac]?.dates,
                                    discount: tempValue,
                                });
                                tempAppliedStayPayDates.push(...filteredStayPays[ac]?.dates);
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

        let appliedMealUpgrades = []; // [{ promotion: "", rateCode: "", dates: [], }]
        let uniqueMealUpgrades = [];
        let mealUpgradeTexts = [];
        let appliedMealDates = [];

        const applyMealUpgradeOnEachItem = ({ sortedMealUpgrades, mealUpgradePromotion }) => {
            try {
                for (let ac = 0; ac < sortedMealUpgrades?.length; ac++) {
                    for (let ae = 0; ae < sortedMealUpgrades[ac]?.dates?.length; ae++) {
                        if (appliedMealDates?.includes(sortedMealUpgrades[ac]?.dates[ae])) {
                            sortedMealUpgrades[ac]?.dates?.splice(ae, 1);
                            sortedMealUpgrades[ac].noOfNights -= 1;
                        }
                    }

                    if (
                        sortedMealUpgrades[ac]?.minimumLengthOfStay <=
                            sortedMealUpgrades[ac]?.noOfNights &&
                        sortedMealUpgrades[ac]?.maximumLengthOfStay >=
                            sortedMealUpgrades[ac]?.noOfNights
                    ) {
                        const uniqueMealUpgradeIndex = uniqueMealUpgrades?.findIndex((item) => {
                            return (
                                item?.mealTo?._id?.toString() ===
                                sortedMealUpgrades[ac]?.mealTo?._id?.toString()
                            );
                        });

                        if (uniqueMealUpgradeIndex === -1) {
                            uniqueMealUpgrades.push({
                                mealTo: sortedMealUpgrades[ac]?.mealTo,
                                dates: sortedMealUpgrades[ac]?.dates,
                            });
                        } else {
                            uniqueMealUpgrades[uniqueMealUpgradeIndex].mealTo =
                                sortedMealUpgrades[ac]?.mealTo;
                            uniqueMealUpgrades[uniqueMealUpgradeIndex]?.dates?.push(
                                ...sortedMealUpgrades[ac].dates
                            );
                        }

                        appliedMealUpgrades.push({
                            promotion: mealUpgradePromotion?._id,
                            rateCode: sortedMealUpgrades[ac]?.rateCode,
                            dates: sortedMealUpgrades[ac]?.dates,
                            upgradedMeal: sortedMealUpgrades[ac]?.mealTo?._id,
                        });
                        appliedMealDates.push(...sortedMealUpgrades[ac]?.dates);
                    }
                }
            } catch (err) {
                throw err;
            }
        };

        if (allMealUpgrades?.length > 0) {
            for (let ab = 0; ab < allMealUpgrades?.length; ab++) {
                const mealUpgradePromotion = allMealUpgrades[ab]?.promotion;
                const sortedMealUpgrades = allMealUpgrades[ab]?.mealUpgrades?.sort((a, b) => {
                    return b?.minimumLengthOfStay - a?.minimumLengthOfStay;
                });

                applyMealUpgradeOnEachItem({ sortedMealUpgrades, mealUpgradePromotion });

                for (let aa = 0; aa < allMealUpgrades[ab]?.combinedPromotions?.length; aa++) {
                    const mealUpgradePromotion =
                        allMealUpgrades[ab]?.combinedPromotions[aa]?.promotion;
                    const sortedMealUpgrades = allMealUpgrades[ab]?.combinedPromotions[
                        aa
                    ]?.mealUpgrades?.sort((a, b) => {
                        return b?.minimumLengthOfStay - a?.minimumLengthOfStay;
                    });

                    applyMealUpgradeOnEachItem({ sortedMealUpgrades, mealUpgradePromotion });
                }
            }

            // ony for displaying on frontend
            for (let ad = 0; ad < uniqueMealUpgrades?.length; ad++) {
                if (boardTypesWithKeyVal[uniqueMealUpgrades[ad]?.mealTo]) {
                    mealUpgradeTexts.push(
                        `${uniqueMealUpgrades[ad]?.dates?.length} days meal upgraded to ${
                            boardTypesWithKeyVal[uniqueMealUpgrades[ad]?.mealTo]?.boardName
                        }. (${uniqueMealUpgrades[ad]?.dates?.toString()?.replace(",", ", ")})`
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
                for (let ac = 0; ac < sortedRoomTypeUpgrades?.length; ac++) {
                    for (let ae = 0; ae < sortedRoomTypeUpgrades[ac]?.dates?.length; ae++) {
                        if (appliedRoomTypeDates?.includes(sortedRoomTypeUpgrades[ac]?.dates[ae])) {
                            sortedRoomTypeUpgrades[ac]?.dates?.splice(ae, 1);
                            sortedRoomTypeUpgrades[ac].noOfNights -= 1;
                        }
                    }

                    if (
                        sortedRoomTypeUpgrades[ac]?.minimumLengthOfStay <=
                            sortedRoomTypeUpgrades[ac]?.noOfNights &&
                        sortedRoomTypeUpgrades[ac]?.maximumLengthOfStay >=
                            sortedRoomTypeUpgrades[ac]?.noOfNights
                    ) {
                        const uniqueMealUpgradeIndex = uniqueRoomTypeUpgrades?.findIndex((item) => {
                            return (
                                item?.roomTypeTo?._id?.toString() ===
                                sortedRoomTypeUpgrades[ac]?.roomTypeTo?._id?.toString()
                            );
                        });

                        if (uniqueMealUpgradeIndex === -1) {
                            uniqueRoomTypeUpgrades.push({
                                roomTypeTo: sortedRoomTypeUpgrades[ac]?.roomTypeTo,
                                dates: sortedRoomTypeUpgrades[ac]?.dates,
                            });
                        } else {
                            uniqueRoomTypeUpgrades[uniqueMealUpgradeIndex].roomTypeTo =
                                sortedRoomTypeUpgrades[ac]?.roomTypeTo;
                            uniqueRoomTypeUpgrades[uniqueMealUpgradeIndex]?.dates?.push(
                                ...sortedRoomTypeUpgrades[ac].dates
                            );
                        }

                        appliedRoomTypeUpgrades.push({
                            promotion: roomTypeUpgradePromotion?._id,
                            rateCode: sortedRoomTypeUpgrades[ac]?.rateCode,
                            dates: sortedRoomTypeUpgrades[ac]?.dates,
                            upgradedRoomType: sortedRoomTypeUpgrades[ac]?.roomTypeTo?._id,
                        });
                        appliedRoomTypeDates.push(...sortedRoomTypeUpgrades[ac]?.dates);
                    }
                }
            } catch (err) {
                throw err;
            }
        };

        if (allRoomTypeUpgrades?.length > 0) {
            for (let ab = 0; ab < allRoomTypeUpgrades?.length; ab++) {
                const roomTypeUpgradePromotion = allRoomTypeUpgrades[ab]?.promotion;
                const sortedRoomTypeUpgrades = allRoomTypeUpgrades[ab]?.roomTypeUpgrades?.sort(
                    (a, b) => {
                        return b?.minimumLengthOfStay - a?.minimumLengthOfStay;
                    }
                );

                applyRoomTypeUpgradeOnEachItem({
                    sortedRoomTypeUpgrades,
                    roomTypeUpgradePromotion,
                });

                for (let aa = 0; aa < allRoomTypeUpgrades[ab]?.combinedPromotions?.length; aa++) {
                    const roomTypeUpgradePromotion =
                        allRoomTypeUpgrades[ab]?.combinedPromotions[aa]?.promotion;
                    const sortedRoomTypeUpgrades = allRoomTypeUpgrades[ab]?.combinedPromotions[
                        aa
                    ]?.mealUpgrades?.sort((a, b) => {
                        return b?.minimumLengthOfStay - a?.minimumLengthOfStay;
                    });

                    applyRoomTypeUpgradeOnEachItem({
                        sortedRoomTypeUpgrades,
                        roomTypeUpgradePromotion,
                    });
                }
            }

            for (let ad = 0; ad < uniqueRoomTypeUpgrades?.length; ad++) {
                if (roomTypesWithKeyVal[uniqueRoomTypeUpgrades[ad]?.roomTypeTo]) {
                    roomTypeUpgradeTexts.push(
                        `${uniqueRoomTypeUpgrades[ad]?.dates?.length} days room type upgraded to ${
                            roomTypesWithKeyVal[uniqueRoomTypeUpgrades[ad]?.roomTypeTo]?.roomName
                        }. (${uniqueRoomTypeUpgrades[ad]?.dates?.toString()?.replace(",", ", ")})`
                    );
                }
            }
        }

        let appliedDiscounts = []; // [{ promotion: "", rateCode: "", dates: [], discount: 0 }]
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

                                const dateObjIndex = basePlan.contracts?.findIndex((item) => {
                                    return item?.date === sortedDiscounts[ac]?.dates[sc]?.date;
                                });
                                if (dateObjIndex !== -1) {
                                    for (
                                        let dx = 0;
                                        dx <
                                        sortedDiscounts[ac]?.dates[sc]?.selectedRoomOccupancies
                                            ?.length;
                                        dx++
                                    ) {
                                        const selectedRoomOccupancy =
                                            sortedDiscounts[ac]?.dates[sc]?.selectedRoomOccupancies[
                                                dx
                                            ];
                                        for (
                                            let sd = 0;
                                            sd < sortedDiscounts[ac]?.roomTypes?.length;
                                            sd++
                                        ) {
                                            let disRoomType = sortedDiscounts[ac]?.roomTypes[sd];
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
                                                    let date = sortedDiscounts[ac]?.dates[sc]?.date;
                                                    let appliedTempDiscount = 0;
                                                    if (
                                                        sortedDiscounts[ac]?.discountType === "flat"
                                                    ) {
                                                        appliedTempDiscount +=
                                                            disRoomType?.roomOccupancies[
                                                                occupancyObjIndex
                                                            ]?.discount;
                                                    } else {
                                                        // TODO:
                                                        // update extrbed and mealsupplement calculation.
                                                        // if is is different for each occupancy then this fails
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
                                                        appliedTempDiscount +=
                                                            (disRoomType?.roomOccupancies[
                                                                occupancyObjIndex
                                                            ]?.discount /
                                                                100) *
                                                            selectedRoomOccupancy?.price;
                                                        // basePlan.contracts[dateObjIndex]
                                                        //     ?.roomPrice;
                                                    }
                                                    // adding these to applied promotions
                                                    discountOffer += appliedTempDiscount;
                                                    appliedDiscounts.push({
                                                        promotion: discountPromo?._id,
                                                        rateCode: sortedDiscounts[ac]?.rateCode,
                                                        dates: [date],
                                                        discount: appliedTempDiscount,
                                                    });
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
            appliedStayPays,
            appliedMealUpgrades,
            // uniqueMealUpgrades,
            appliedRoomTypeUpgrades,
            // uniqueRoomTypeUpgrades,
            appliedPromotions: [...mealUpgradeTexts, ...roomTypeUpgradeTexts],
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

module.exports = { applyPromotion };
