const { default: axios } = require("axios");
const B2BHotelProvider = require("../../models/hotel/b2bHotelProviders.model");
const { extractRoomCategoryInfo, capitalizeFirstLetter } = require("../../utils/string");
const { generateUniqueString } = require("../../../utils");

const IOLX_BASE_URL = process.env.IOLX_BASE_URL;
const IOLX_PROFILE_PASSWORD = process.env.IOLX_PROFILE_PASSWORD;
const IOLX_PROFILE_CODE = process.env.IOLX_PROFILE_CODE;

const getIolxHotelAvailabilityByHotelCodes = async ({
    fromDate,
    toDate,
    rooms,
    nationality,
    iolxHotelCodes,
    tokenNumber,
}) => {
    const Profile = {
        Password: IOLX_PROFILE_PASSWORD,
        Code: IOLX_PROFILE_CODE,
        TokenNumber: tokenNumber,
    };

    let HotelCode = iolxHotelCodes.join(",");
    const Room = {
        Adult: [],
        Child: [],
    };

    rooms.forEach((element, index) => {
        Array.from({ length: element?.noOfAdults })?.map((_, adtIndex) => {
            Room.Adult.push({
                Age: 22,
            });
        });

        Array.from({ length: element?.noOfChildren })?.map((_, arrIndex) => {
            Room.Child.push({
                Age: element.childrenAges[arrIndex],
            });
        });
    });

    const StartDate = fromDate.replace(/-/g, "");
    const EndDate = toDate.replace(/-/g, "");

    const body = {
        OutputFormat: "JSON",
        Profile,
        SearchCriteria: {
            RoomConfiguration: {
                Room: [Room],
            },
            StartDate,
            EndDate,
            // StartDate: 20241015,
            // EndDate: 20241020,
            // HotelCode: "137-1333,106-1147,106-1298,218-1169",
            HotelCode,
            Nationality: nationality,
            GroupByRooms: "Y",
            CancellationPolicy: "Y",
        },
    };

    const URL = IOLX_BASE_URL + "/hotel/api/v1/search";

    try {
        const response = await axios.post(URL, {
            ...body,
        });

        if (response.data?.ErrorMessage?.Error)
            return Promise.reject(response?.data.ErrorMessage.Error.Messages);

        return response.data;
    } catch (error) {
        Promise.reject(error);
    }
};

const getHotelAvailabilitiesFromIOLX = async ({
    fromDate,
    toDate,
    rooms,
    nationality,
    noOfNights,
    configuration,
    priceType,
    iolxHotelCodes,
    hotelsWithIolxId,
}) => {
    if (
        iolxHotelCodes.length &&
        iolxHotelCodes.length > 0 &&
        configuration?.showIolxHotels === true &&
        priceType !== "static"
    ) {
        console.time("iolx search");
        const tokenNumber = generateUniqueString("TOK");

        try {
            const data = await getIolxHotelAvailabilityByHotelCodes({
                fromDate,
                toDate,
                rooms,
                nationality,
                iolxHotelCodes,
                tokenNumber,
            });

            const iolxHotels = [];
            if (data && data.Hotels && data.Hotels.Hotel && data.Hotels.Hotel.length) {
                const hotels = data.Hotels.Hotel;

                hotels.forEach((hotel) => {
                    const rooms = hotel.RoomTypeDetails.Rooms.Room;

                    const minRate = Math.min(...rooms.map((room) => room.Rate)) || 0;
                    const maxRate = Math.max(...rooms.map((room) => room.Rate)) || 0;
                    const totalOffer =
                        rooms.find((room) => room.Rate === minRate)?.TotalDiscount || 0;

                    iolxHotels.push({
                        hotel: hotelsWithIolxId[hotel?.HotelCode],
                        rooms: [],
                        minRate,
                        maxRate,
                        totalOffer,
                        noOfNights,
                    });
                });
            }

            console.timeEnd("iolx search");

            return { iolxHotels };
        } catch (error) {
            Promise.reject(error);
        }
    }
    return { iolxHotels: [] };
};

const getRoomsAvailabilityFromIOLX = async ({
    fromDate,
    toDate,
    rooms,
    marketStrategy,
    profileMarkup,
    nationality,
    iolxHotelCodes,
    hotelsWithIolxId,
    noOfNights,
    clientMarkups,
    clientStarCategoryMarkups,
    subAgentMarkups,
    subAgentStarCategoryMarkups,
    reseller,
    configuration,
    priceType,
}) => {
    if (
        iolxHotelCodes.length &&
        iolxHotelCodes.length > 0 &&
        configuration?.showIolxHotels === true &&
        priceType !== "static"
    ) {
        console.time("iolx search");

        const tokenNumber = generateUniqueString("TOK");

        try {
            const data = await getIolxHotelAvailabilityByHotelCodes({
                fromDate,
                toDate,
                rooms,
                nationality,
                iolxHotelCodes,
                tokenNumber,
            });

            const providerDetails = await B2BHotelProvider.findOne({
                name: "Iolx",
                isDeleted: false,
                isActive: true,
            });

            const hotelProviderId = providerDetails?._id?.toString();

            const iolxHotels = [];

            function markupAddForRates(hotelAvailability) {
                if (!providerDetails.configurations.hasRoomTypeAvailable) {
                    return new Promise((resolve, reject) => {
                        let apiRates = [];
                        let minRateAdded = false;
                        let minRate = 0;
                        let minRateOffer = 0;
                        let maxRate = 0;

                        if (hotelAvailability?.RoomTypeDetails?.Rooms.Room?.length) {
                            let marketMarkup;
                            let b2bMarkup;

                            const findHotelMarkup = (strategy, providerId) => {
                                const hotelDetails = strategy?.hotel?.find(
                                    (hotel) =>
                                        hotel?.hotelId?.toString() ===
                                        hotelsWithIolxId[hotelAvailability?.HCode]?._id?.toString()
                                );
                                return hotelDetails?.hotelMarkup?.find(
                                    (markupDoc) =>
                                        markupDoc?.hotelProviderId?.toString() === providerId &&
                                        markupDoc?.markup !== 0
                                );
                            };

                            if (marketStrategy) {
                                marketMarkup = findHotelMarkup(marketStrategy, hotelProviderId);

                                if (!marketMarkup) {
                                    const starCategoryDetails = marketStrategy?.starCategory?.find(
                                        (starCat) =>
                                            starCat?.name ===
                                            hotelsWithIolxId[hotelAvailability?.HCode]?.starCategory
                                    );

                                    if (starCategoryDetails) {
                                        marketMarkup = starCategoryDetails?.markups.find(
                                            (markupDoc) =>
                                                markupDoc?.hotelProviderId?.toString() ===
                                                hotelProviderId
                                        );
                                    }
                                }
                            }

                            if (profileMarkup) {
                                b2bMarkup = findHotelMarkup(profileMarkup, hotelProviderId);

                                if (!b2bMarkup) {
                                    const starCategoryDetails = profileMarkup?.starCategory.find(
                                        (starCat) =>
                                            starCat?.name ===
                                            hotelsWithIolxId[hotelAvailability?.HCode]?.starCategory
                                    );

                                    if (starCategoryDetails) {
                                        b2bMarkup = starCategoryDetails?.markups.find(
                                            (markupDoc) =>
                                                markupDoc?.hotelProviderId?.toString() ===
                                                hotelProviderId
                                        );
                                    }
                                }
                            }

                            // let clientMarkup = clientMarkups?.find(
                            //     (item) =>
                            //         item?.roomTypeId?.toString() ===
                            //         selRoomTypes[n]?._id?.toString()
                            // );
                            // if (!clientMarkup) {
                            //     clientMarkup = clientStarCategoryMarkups?.find(
                            //         (item) => {
                            //             return (
                            //                 item?.name ===
                            //                 hotelsWithIolxId[hotelAvailability?.HCode]
                            //                     ?.starCategory
                            //             );
                            //         }
                            //     );
                            // }
                            let subAgentMarkup;
                            if (reseller?.role === "sub-agent") {
                                subAgentMarkup = subAgentMarkups?.find(
                                    (item) =>
                                        item?.roomTypeId?.toString() ===
                                        selRoomTypes[n]?._id?.toString()
                                );
                                if (!subAgentMarkup) {
                                    subAgentMarkup = subAgentStarCategoryMarkups?.find((item) => {
                                        return (
                                            item?.name ===
                                            hotelsWithIolxId[hotelAvailability?.HCode]?.starCategory
                                        );
                                    });
                                }
                            }

                            // const Romms = hotelAvailability.RoomTypeDetails.Rooms.Room

                            const Romms = hotelAvailability.RoomTypeDetails.Rooms.Room;
                            // const HKey = vendor.HKey;
                            for (const room of Romms) {
                                const {
                                    RoomType,
                                    MealPlan,
                                    TotalRate,
                                    Rate,
                                    CurrCode,
                                    TotalDiscount,
                                    ContractTokenId,
                                    MealPlanCode,
                                    RoomTypeCode,
                                    RoomConfigurationId,
                                    ContractLabel,
                                    CancellationPolicyDetails,
                                    RoomNo,
                                } = room;
                                const { bed } = extractRoomCategoryInfo(RoomType);

                                let apiRateDetails = {
                                    // roomTypeId: selRoomTypes[n]?._id,
                                    roomName: RoomType,
                                    boardBasis: MealPlan,
                                    // code: room?.HKey,
                                    provider: "Iolx",
                                    providerHotelId: hotelAvailability?.HotelCode,
                                    currency: CurrCode,
                                    // roomType: {
                                    //     _id: selRoomTypes[n]?._id,
                                    //     roomName: selRoomTypes[n]?.roomName,
                                    //     serviceBy: selRoomTypes[n]?.serviceBy,
                                    //     amenities: selRoomTypes[n]?.amenities,
                                    //     areaInM2: selRoomTypes[n]?.areaInM2,
                                    //     images: selRoomTypes[n]?.images,
                                    // },
                                    rates: [],
                                };

                                let netPriceAED = Number(TotalRate);
                                let priceWithMarkup = netPriceAED;

                                let adminMarketMarkup = 0;
                                if (marketMarkup && !isNaN(marketMarkup.markup)) {
                                    if (marketMarkup.markupType === "flat") {
                                        adminMarketMarkup = marketMarkup.markup * noOfNights;
                                    } else {
                                        adminMarketMarkup =
                                            (priceWithMarkup / 100) * marketMarkup.markup;
                                    }
                                }
                                priceWithMarkup += adminMarketMarkup;

                                let adminB2bMarkup = 0;
                                if (b2bMarkup && !isNaN(b2bMarkup.markup)) {
                                    if (b2bMarkup.markupType === "flat") {
                                        adminB2bMarkup = b2bMarkup.markup * noOfNights;
                                    } else {
                                        adminB2bMarkup = (priceWithMarkup / 100) * b2bMarkup.markup;
                                    }
                                }
                                priceWithMarkup += adminB2bMarkup;

                                let saMarkup = 0;
                                if (subAgentMarkup && !isNaN(subAgentMarkup.markup)) {
                                    if (subAgentMarkup.markupType === "flat") {
                                        saMarkup = subAgentMarkup.markup * noOfNights;
                                    } else {
                                        saMarkup = (priceWithMarkup / 100) * subAgentMarkup.markup;
                                    }
                                }
                                priceWithMarkup += saMarkup;

                                let clMarkup = 0;
                                // if (
                                //     clientMarkup &&
                                //     !isNaN(clientMarkup.markup)
                                // ) {
                                //     if (clientMarkup.markupType === "flat") {
                                //         clMarkup =
                                //             clientMarkup.markup * noOfNights;
                                //     } else {
                                //         clMarkup =
                                //             (priceWithMarkup / 100) *
                                //             clientMarkup.markup;
                                //     }
                                // }
                                // priceWithMarkup += clMarkup;

                                const totalOffer = TotalDiscount || 0;

                                apiRateDetails.rates.push({
                                    provider: "Iolx",
                                    detailsKey: `${hotelProviderId}|${hotelAvailability?.HotelCode}`,
                                    rateInfo: {
                                        roomType: RoomType,
                                        fromDate,
                                        toDate,
                                        rooms,
                                        nationality,
                                        tokenNumber,
                                        hotelCode: hotelAvailability?.HotelCode,
                                        rateKey: `${RoomTypeCode}|${ContractTokenId}|${MealPlanCode}|${RoomConfigurationId}|${TotalRate}|${CurrCode}`,
                                        policies: CancellationPolicyDetails,
                                        rateDetails: {
                                            roomNo: RoomNo,
                                            roomTypeCode: RoomTypeCode,
                                            contractTokenId: ContractTokenId,
                                            mealPlanCode: MealPlanCode,
                                            roomConfigurationId: RoomConfigurationId,
                                            rate: TotalRate,
                                            currencyCode: CurrCode,
                                            rateKey: `${RoomTypeCode}|${ContractTokenId}|${MealPlanCode}|${RoomConfigurationId}|${TotalRate}|${CurrCode}`,
                                        },
                                    },
                                    rateKey: `${RoomTypeCode}|${ContractTokenId}|${MealPlanCode}|${RoomConfigurationId}|${TotalRate}|${CurrCode}`,
                                    rateName:
                                        apiRateDetails.roomName +
                                        " with " +
                                        MealPlan?.toLowerCase(),
                                    boardCode: room?.boardCode,
                                    boardName:
                                        room?.boardName?.toLowerCase() || MealPlan?.toLowerCase(),
                                    selectedRoomOccupancies: [
                                        {
                                            occupancyId: undefined,
                                            occupancyName: bed.type?.toLowerCase() || "",
                                            shortName: bed?.typeShort || "",
                                            count: bed?.count || 0,
                                            price: netPriceAED,
                                            rollBedApplied: 0,
                                            extraBedApplied: 0,
                                        },
                                    ],
                                    roomPrice: netPriceAED,
                                    netPrice: priceWithMarkup,
                                    grossPrice: priceWithMarkup + totalOffer,
                                    addOnsTxt: [],
                                    promotions:
                                        room?.promotions?.map((item) => {
                                            return item.name;
                                        }) || [],
                                    availableAllocation: room?.allotment,
                                    cancellationPolicies: room?.cancellationPolicies?.map(
                                        (item) => {
                                            return `If you cancel this booking from ${item?.from} you will be charged ${item?.amount} AED.`;
                                        }
                                    ),
                                    cancellationType: "",
                                    totalOffer,
                                    rateComments:
                                        room?.rateComments ||
                                        (ContractLabel && [ContractLabel]) ||
                                        [],
                                    markup: {
                                        adminMarketMarkup,
                                        adminB2bMarkup, // admin markup for b2b
                                        subAgentMarkup: saMarkup, // markup for subagents from agent
                                        clientMarkup: clMarkup, // markup for client
                                    },
                                    isApiConnected: true,
                                });

                                if (minRate === 0 && minRateAdded === false) {
                                    minRate = priceWithMarkup;
                                    minRateOffer = totalOffer;
                                    minRateAdded = true;
                                } else if (minRate > priceWithMarkup) {
                                    minRate = priceWithMarkup;
                                    minRateOffer = totalOffer;
                                } else if (maxRate < priceWithMarkup) {
                                    maxRate = priceWithMarkup;
                                }

                                apiRates.push(apiRateDetails);
                            }
                            if (apiRates?.length > 0) {
                                iolxHotels.push({
                                    hotel: hotelsWithIolxId[hotelAvailability?.HotelCode],
                                    rooms: apiRates,
                                    minRate,
                                    maxRate,
                                    totalOffer: minRateOffer,
                                    noOfNights,
                                });
                            }
                        }
                        resolve();
                    });
                } else {
                    return new Promise(async (resolve, reject) => {
                        let apiRooms = [];
                        let minRateAdded = false;
                        let minRate = 0;
                        let minRateOffer = 0;
                        let maxRate = 0;

                        let roomCodes = hotelAvailability?.VendorList?.map((item) => item?.HKey);

                        if (hotelAvailability?.VendorList?.length > 0 && roomCodes?.length > 0) {
                            const roomTypes = await OtiilaRoomType.find({
                                hotel: hotelsWithIolxId[hotelAvailability?.HCode]?._id,
                                ottilaId: { $in: roomCodes },
                                // isDeleted: false,
                                // isActive: true,
                            })
                                .populate("amenities", "name")
                                .lean();

                            if (roomTypes?.length > 0) {
                                for (let i = 0; i < hotelAvailability?.VendorList?.length; i++) {
                                    const room = hotelAvailability?.VendorList[i];

                                    let selRoomTypes = [];
                                    for (let m = 0; m < roomTypes?.length; m++) {
                                        if (roomTypes[m]?.ottilaId === room?.HKey) {
                                            selRoomTypes.push(roomTypes[m]);
                                        }
                                    }
                                    if (selRoomTypes?.length > 0) {
                                        for (let n = 0; n < selRoomTypes?.length; n++) {
                                            let apiRoom = {
                                                roomTypeId: selRoomTypes[n]?._id,
                                                roomName: selRoomTypes[n]?.roomName,
                                                code: room?.HKey,
                                                provider: "Ottila",
                                                providerHotelId: hotelAvailability?.HCode,
                                                currency: response?.data?.Currency,
                                                roomType: {
                                                    _id: selRoomTypes[n]?._id,
                                                    roomName: selRoomTypes[n]?.roomName,
                                                    serviceBy: selRoomTypes[n]?.serviceBy,
                                                    amenities: selRoomTypes[n]?.amenities,
                                                    areaInM2: selRoomTypes[n]?.areaInM2,
                                                    images: selRoomTypes[n]?.images,
                                                },
                                                rates: [],
                                            };

                                            let marketMarkup;
                                            if (marketStrategy) {
                                                for (
                                                    let mi = 0;
                                                    mi < marketStrategy?.hotel?.length;
                                                    mi++
                                                ) {
                                                    if (
                                                        marketStrategy?.hotel[
                                                            mi
                                                        ]?.hotelId?.toString() ===
                                                        hotelsWithIolxId[
                                                            hotelAvailability?.HCode
                                                        ]?._id?.toString()
                                                    ) {
                                                        for (
                                                            let mj = 0;
                                                            mj <
                                                            marketStrategy?.hotel[mi]?.roomTypes
                                                                ?.length;
                                                            mj++
                                                        ) {
                                                            let tempRmType =
                                                                marketStrategy?.hotel[mi]
                                                                    ?.roomTypes[mj];
                                                            if (
                                                                tempRmType?.roomTypeId?.toString() ===
                                                                    selRoomTypes[
                                                                        n
                                                                    ]?._id.toString() &&
                                                                tempRmType?.hotelProviderId?.toString() ===
                                                                    hotelProviderId
                                                            ) {
                                                                marketMarkup = tempRmType;
                                                                break;
                                                            }
                                                        }

                                                        break;
                                                    }
                                                }
                                                if (!marketMarkup) {
                                                    for (
                                                        let mi = 0;
                                                        mi < marketStrategy?.starCategory?.length;
                                                        mi++
                                                    ) {
                                                        if (
                                                            marketStrategy?.starCategory[mi]
                                                                ?.name ===
                                                            hotelsWithIolxId[
                                                                hotelAvailability?.HCode
                                                            ]?.starCategory
                                                        ) {
                                                            for (
                                                                let mj = 0;
                                                                mj <
                                                                marketStrategy?.starCategory[mi]
                                                                    ?.markups?.length;
                                                                mj++
                                                            ) {
                                                                let tempMarkup =
                                                                    marketStrategy?.starCategory[mi]
                                                                        ?.markups[mj];
                                                                if (
                                                                    tempMarkup?.hotelProviderId?.toString() ===
                                                                    hotelProviderId
                                                                ) {
                                                                    marketMarkup = tempMarkup;
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            let b2bMarkup;
                                            if (profileMarkup) {
                                                for (
                                                    let mi = 0;
                                                    mi < profileMarkup?.hotel?.length;
                                                    mi++
                                                ) {
                                                    if (
                                                        profileMarkup?.hotel[
                                                            mi
                                                        ]?.hotelId?.toString() ===
                                                        hotelsWithIolxId[
                                                            hotelAvailability?.HCode
                                                        ]?._id?.toString()
                                                    ) {
                                                        for (
                                                            let mj = 0;
                                                            mj <
                                                            profileMarkup?.hotel[mi]?.roomTypes
                                                                ?.length;
                                                            mj++
                                                        ) {
                                                            let tempRmType =
                                                                profileMarkup?.hotel[mi]?.roomTypes[
                                                                    mj
                                                                ];
                                                            if (
                                                                tempRmType?.roomTypeId?.toString() ===
                                                                    selRoomTypes[
                                                                        n
                                                                    ]?._id.toString() &&
                                                                tempRmType?.hotelProviderId?.toString() ===
                                                                    hotelProviderId
                                                            ) {
                                                                b2bMarkup = tempRmType;
                                                                break;
                                                            }
                                                        }

                                                        break;
                                                    }
                                                }
                                                if (!b2bMarkup) {
                                                    for (
                                                        let mi = 0;
                                                        mi < profileMarkup?.starCategory?.length;
                                                        mi++
                                                    ) {
                                                        if (
                                                            profileMarkup?.starCategory[mi]
                                                                ?.name ===
                                                            hotelsWithIolxId[
                                                                hotelAvailability?.HCode
                                                            ]?.starCategory
                                                        ) {
                                                            for (
                                                                let mj = 0;
                                                                mj <
                                                                profileMarkup?.starCategory[mi]
                                                                    ?.markups?.length;
                                                                mj++
                                                            ) {
                                                                let tempMarkup =
                                                                    profileMarkup?.starCategory[mi]
                                                                        ?.markups[mj];
                                                                if (
                                                                    tempMarkup?.hotelProviderId?.toString() ===
                                                                    hotelProviderId
                                                                ) {
                                                                    b2bMarkup = tempMarkup;
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            let clientMarkup = clientMarkups?.find((item) => {
                                                return (
                                                    item?.roomTypeId?.toString() ===
                                                    selRoomTypes[n]?._id?.toString()
                                                );
                                            });
                                            if (!clientMarkup) {
                                                clientMarkup = clientStarCategoryMarkups?.find(
                                                    (item) => {
                                                        return (
                                                            item?.name ===
                                                            hotelsWithIolxId[
                                                                hotelAvailability?.HCode
                                                            ]?.starCategory
                                                        );
                                                    }
                                                );
                                            }
                                            let subAgentMarkup;
                                            if (reseller?.role === "sub-agent") {
                                                subAgentMarkup = subAgentMarkups?.find((item) => {
                                                    return (
                                                        item?.roomTypeId?.toString() ===
                                                        selRoomTypes[n]?._id?.toString()
                                                    );
                                                });
                                                if (!subAgentMarkup) {
                                                    subAgentMarkup =
                                                        subAgentStarCategoryMarkups?.find(
                                                            (item) => {
                                                                return (
                                                                    item?.name ===
                                                                    hotelsWithIolxId[
                                                                        hotelAvailability?.HCode
                                                                    ]?.starCategory
                                                                );
                                                            }
                                                        );
                                                }
                                            }

                                            for (
                                                let j = 0;
                                                j <
                                                hotelAvailability?.VendorList[i]?.RateDetails
                                                    ?.length;
                                                j++
                                            ) {
                                                let room =
                                                    hotelAvailability?.VendorList[i]?.RateDetails[
                                                        j
                                                    ];
                                                // if (rate?.rateType === "RECHECK" && 1 === 2) {
                                                //     const newRateRes = await getSingleHotelBedRate({
                                                //         rateKey: rate?.rateKey,
                                                //     });
                                                //     if (newRateRes[0]?.rooms[0]?.rates[0]) {
                                                //         rate = hotelAvailability?.rooms[i]?.rates[j];
                                                //         rate.rateComments = [rate.rateComments];
                                                //     }
                                                // }

                                                if (rate?.rateCommentsId && !rate?.rateComments) {
                                                    // TODO
                                                    // date conditon, rateCodes conditon
                                                    const splitRateComments =
                                                        rate?.rateCommentsId?.split("|");
                                                    let rateComments = [];
                                                    hbRateComments?.forEach((item) => {
                                                        if (
                                                            item.hotel ===
                                                                hotelAvailability?.HCode &&
                                                            item.incoming?.toString() ===
                                                                splitRateComments[0]?.toString() &&
                                                            item.code?.toString() ===
                                                                splitRateComments[1]?.toString()
                                                        ) {
                                                            item?.commentsByRates?.forEach(
                                                                (rateComment) => {
                                                                    rateComment?.comments?.forEach(
                                                                        (comment) => {
                                                                            rateComments.push(
                                                                                comment?.description
                                                                            );
                                                                        }
                                                                    );
                                                                }
                                                            );
                                                        }
                                                    });

                                                    rate.rateComments = rateComments;
                                                }

                                                let netPriceAED = Number(rate?.Amount);
                                                let priceWithMarkup = netPriceAED;

                                                let adminMarketMarkup = 0;
                                                if (marketMarkup && !isNaN(marketMarkup.markup)) {
                                                    if (marketMarkup.markupType === "flat") {
                                                        adminMarketMarkup =
                                                            marketMarkup.markup * noOfNights;
                                                    } else {
                                                        adminMarketMarkup =
                                                            (priceWithMarkup / 100) *
                                                            marketMarkup.markup;
                                                    }
                                                }
                                                priceWithMarkup += adminMarketMarkup;

                                                let adminB2bMarkup = 0;
                                                if (b2bMarkup && !isNaN(b2bMarkup.markup)) {
                                                    if (b2bMarkup.markupType === "flat") {
                                                        adminB2bMarkup =
                                                            b2bMarkup.markup * noOfNights;
                                                    } else {
                                                        adminB2bMarkup =
                                                            (priceWithMarkup / 100) *
                                                            b2bMarkup.markup;
                                                    }
                                                }
                                                priceWithMarkup += adminB2bMarkup;

                                                let saMarkup = 0;
                                                if (
                                                    subAgentMarkup &&
                                                    !isNaN(subAgentMarkup.markup)
                                                ) {
                                                    if (subAgentMarkup.markupType === "flat") {
                                                        saMarkup =
                                                            subAgentMarkup.markup * noOfNights;
                                                    } else {
                                                        saMarkup =
                                                            (priceWithMarkup / 100) *
                                                            subAgentMarkup.markup;
                                                    }
                                                }
                                                priceWithMarkup += saMarkup;

                                                let clMarkup = 0;
                                                if (clientMarkup && !isNaN(clientMarkup.markup)) {
                                                    if (clientMarkup.markupType === "flat") {
                                                        clMarkup = clientMarkup.markup * noOfNights;
                                                    } else {
                                                        clMarkup =
                                                            (priceWithMarkup / 100) *
                                                            clientMarkup.markup;
                                                    }
                                                }
                                                priceWithMarkup += clMarkup;

                                                const totalOffer =
                                                    rate?.offers?.reduce(
                                                        (a, b) => a + Math.abs(b?.amount),
                                                        0
                                                    ) || 0;

                                                apiRoom.rates.push({
                                                    detailsKey: `${hotelProviderId}|${hotelAvailability?.HCode}|${apiRoom.roomTypeId}`,
                                                    rateKey: rate?.RateKey,
                                                    rateName:
                                                        apiRoom?.roomType?.roomName +
                                                        " with " +
                                                        rate?.Meal?.toLowerCase(),
                                                    boardCode: rate?.boardCode,
                                                    boardName: rate?.boardName?.toLowerCase(),
                                                    selectedRoomOccupancies: [
                                                        {
                                                            occupancyId: undefined,
                                                            occupancyName:
                                                                hotelAvailability?.VendorList[
                                                                    i
                                                                ]?.name?.toLowerCase() || "",
                                                            shortName: "",
                                                            count: rate?.rooms || 0,
                                                            price: netPriceAED,
                                                            rollBedApplied: 0,
                                                            extraBedApplied: 0,
                                                        },
                                                    ],
                                                    roomPrice: netPriceAED,
                                                    netPrice: priceWithMarkup,
                                                    grossPrice: priceWithMarkup + totalOffer,
                                                    addOnsTxt: [],
                                                    promotions:
                                                        rate?.promotions?.map((item) => {
                                                            return item.name;
                                                        }) || [],
                                                    availableAllocation: rate?.allotment,
                                                    cancellationPolicies:
                                                        rate?.cancellationPolicies?.map((item) => {
                                                            return `If you cancel this booking from ${item?.from} you will be charged ${item?.amount} AED.`;
                                                        }),
                                                    cancellationType: "",
                                                    totalOffer,
                                                    rateComments: rate?.rateComments || [],
                                                    markup: {
                                                        adminMarketMarkup,
                                                        adminB2bMarkup, // admin markup for b2b
                                                        subAgentMarkup: saMarkup, // markup for subagents from agent
                                                        clientMarkup: clMarkup, // markup for client
                                                    },
                                                    isApiConnected: true,
                                                });

                                                if (minRate === 0 && minRateAdded === false) {
                                                    minRate = priceWithMarkup;
                                                    minRateOffer = totalOffer;
                                                    minRateAdded = true;
                                                } else if (minRate > priceWithMarkup) {
                                                    minRate = priceWithMarkup;
                                                    minRateOffer = totalOffer;
                                                } else if (maxRate < priceWithMarkup) {
                                                    maxRate = priceWithMarkup;
                                                }
                                            }

                                            const objIndex = apiRooms?.findIndex((item) => {
                                                return (
                                                    item?.roomTypeId?.toString() ===
                                                    apiRoom?.roomTypeId?.toString()
                                                );
                                            });
                                            if (objIndex !== -1) {
                                                apiRooms[objIndex].rates.push(...apiRoom.rates);
                                            } else {
                                                apiRooms.push(apiRoom);
                                            }
                                        }
                                    }
                                }
                                if (apiRooms?.length > 0) {
                                    iolxHotels.push({
                                        hotel: hotelsWithIolxId[hotelAvailability?.HCode],
                                        rooms: apiRooms,
                                        minRate,
                                        maxRate,
                                        totalOffer: minRateOffer,
                                        noOfNights,
                                    });
                                }
                            }
                        }
                        resolve();
                    });
                }
            }

            if (data && data.Hotels && data.Hotels.Hotel && data.Hotels.Hotel.length) {
                const hotels = data.Hotels.Hotel;

                let promises = [];
                hotels.forEach((hotelAvailability) => {
                    promises.push(markupAddForRates(hotelAvailability));
                });

                await Promise.all(promises);
            }

            console.timeEnd("iolx search");

            return { iolxHotels };
        } catch (error) {
            Promise.reject(error);
        }
    }
    return { iolxHotels: [] };
};

const createIOLXBooking = async (rateInfo, rateKey, referenceNumber, travellerDetails, rooms) => {
    const passengers = travellerDetails.map((passenger, idx) => {
        const type = passenger.type === "adult" ? "ADT" : "CHD";
        return {
            paxNumber: idx + 1,
            roomNo: rateInfo.rateDetails.roomNo,
            title: capitalizeFirstLetter(passenger.title),
            passengerType: type,
            age: passenger?.age,
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            nationality: rateInfo.nationality,
            gender: passenger?.gender,
        };
    });

    const startDate = rateInfo.fromDate.replace(/-/g, "");
    const endDate = rateInfo.toDate.replace(/-/g, "");

    const body = {
        profile: {
            Password: IOLX_PROFILE_PASSWORD,
            Code: IOLX_PROFILE_CODE,
            TokenNumber: rateInfo.tokenNumber,
        },
        passengers,
        hotelDetails: {
            startDate,
            endDate,
            hotelCode: rateInfo.hotelCode,

            agencyRef: referenceNumber,
            roomDetails: {
                room: [
                    {
                        roomTypeCode: rateInfo.rateDetails.roomTypeCode,
                        contractTokenId: rateInfo.rateDetails.contractTokenId,
                        mealPlanCode: rateInfo.rateDetails.mealPlanCode,
                        roomConfigurationId: rateInfo.rateDetails.roomConfigurationId,
                        rate: rateInfo.rateDetails.rate,
                        currencyCode: rateInfo.rateDetails.currencyCode,
                    },
                ],
            },
        },
    };

    const URL = IOLX_BASE_URL + "/hotel/book";

    try {
        const response = await axios.post(URL, {
            ...body,
        });

        if (response.data?.ErrorMessage?.Errors)
            return Promise.reject(response?.data.ErrorMessage.Errors?.Error);

        return {
            ...response.data?.BookingDetails,
            SubResNo: response.data?.HotelDetails?.RoomDetails[0]?.SubResNo,
        };
    } catch (error) {
        Promise.reject(error);
    }
};

const cancelIOLXHotelBooking = async (rateInfo) => {
    const { source, rateDetails, bookingNumber } = rateInfo;
    const body = {
        profile: {
            Password: IOLX_PROFILE_PASSWORD,
            Code: IOLX_PROFILE_CODE,
            TokenNumber: rateInfo.tokenNumber,
        },
        bookingDetails: {
            source,
            bookingNumber,
            subResNo: rateDetails.subResNo,
        },
    };

    const URL = IOLX_BASE_URL + "/hotel/booking/cancel";

    try {
        const response = await axios.post(URL, {
            ...body,
        });

        if (response.data?.ErrorMessage?.Errors)
            return Promise.reject(response?.data.ErrorMessage.Errors?.Error);

        return response.data;
    } catch (error) {
        Promise.reject(error);
    }
};

module.exports = {
    getHotelAvailabilitiesFromIOLX,
    getRoomsAvailabilityFromIOLX,
    createIOLXBooking,
    cancelIOLXHotelBooking,
};
