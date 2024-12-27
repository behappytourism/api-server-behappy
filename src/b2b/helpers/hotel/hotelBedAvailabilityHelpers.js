const axios = require("axios");
const crypto = require("crypto");

const { HotelHbRateComment, RoomType, HotelBedRoomType } = require("../../../models/hotel");
const { createHotelLog } = require("./hotelLogsHelpers");

const B2BHotelProvider = require("../../models/hotel/b2bHotelProviders.model");
const { addToJsonNestedFields } = require(".././../../b2b/utils/file");

const publicKey = process.env.HOTEL_BEDS_API_KEY;
const privateKey = process.env.HOTEL_BEDS_SECRET;
const md5 = require("md5");

const getAllHotelsHbAvailability = async ({
    fromDate,
    toDate,
    rooms,
    nationality,
    apiHotelCodes,
    hotelsWithHbId,
    noOfNights,
    configuration,
    priceType,
}) => {
    try {
        if (
            apiHotelCodes?.length > 0 &&
            configuration?.showHotelBedHotels === true &&
            priceType !== "static"
        ) {
            console.time("hotel bed search");

            const utcDate = Math.floor(new Date().getTime() / 1000);
            const signature = publicKey + privateKey + utcDate;
            const signatureHash = crypto.createHash("sha256").update(signature).digest("hex");

            const headers = {
                "Api-key": publicKey,
                "X-Signature": signatureHash,
            };

            let apiOccupanciesArr = [
                {
                    rooms: rooms?.length,
                    adults: 0,
                    children: 0,
                    paxes: [],
                },
            ];
            rooms?.forEach((item) => {
                apiOccupanciesArr[0].adults += Number(item?.noOfAdults) || 0;
                apiOccupanciesArr[0].children += Number(item?.noOfChildren) || 0;
                if (Number(item?.noOfChildren) > 0) {
                    apiOccupanciesArr[0].paxes.push(
                        ...item?.childrenAges?.map((age) => {
                            return {
                                type: "CH",
                                age,
                            };
                        })
                    );
                }
            });

            const body = {
                stay: {
                    checkIn: fromDate,
                    checkOut: toDate,
                },
                occupancies: apiOccupanciesArr,
                hotels: {
                    hotel: apiHotelCodes,
                },
                sourceMarket: nationality ? nationality?.toUpperCase() : null,
            };

            const response = await axios.post(
                `${process.env.HOTEL_BEDS_URL}/hotel-api/1.0/hotels`,
                body,
                {
                    headers: headers,
                }
            );

            // addToJsonNestedFields(body, "HOTELBEDS.RAW_RESPONSE.REQUEST_BODY");

            // addToJsonNestedFields(response.data, "HOTELBEDS.RAW_RESPONSE.RESPONSE_DATA");

            let hotelBedHotels = [];
            if (response.data.hotels.hotels && response.data.hotels.hotels?.length > 0) {
                response.data.hotels.hotels?.forEach((hotelAvailability) => {
                    if (hotelAvailability?.rooms?.length > 0) {
                        let minRate = Number(hotelAvailability?.minRate);
                        let minRateOffer = 0;
                        let maxRate = Number(hotelAvailability?.maxRate);

                        hotelBedHotels.push({
                            hotel: hotelsWithHbId[hotelAvailability?.code],
                            rooms: [],
                            minRate,
                            maxRate,
                            totalOffer: minRateOffer,
                            noOfNights,
                        });
                    }
                });
            }
            console.timeEnd("hotel bed search");
            return { hotelBedHotels, hotelBedRowRes: response?.data };
        }

        return { hotelBedHotels: [], hotelBedRowRes: null };
    } catch (err) {
        console.log(err?.response?.data?.error);
        throw err;
    }
};

const getSingleHotelBedAvailability = async ({
    fromDate,
    toDate,
    rooms,
    marketStrategy,
    profileMarkup,
    nationality,
    apiHotelCodes,
    hotelsWithHbId,
    noOfNights,
    clientMarkups,
    clientStarCategoryMarkups,
    subAgentMarkups,
    subAgentStarCategoryMarkups,
    reseller,
    configuration,
    priceType,
}) => {
    try {
        if (
            apiHotelCodes?.length > 0 &&
            configuration?.showHotelBedHotels === true &&
            priceType !== "static"
        ) {
            console.time("hotel bed search");

            const utcDate = Math.floor(new Date().getTime() / 1000);
            const signature = publicKey + privateKey + utcDate;
            const signatureHash = crypto.createHash("sha256").update(signature).digest("hex");

            const headers = {
                "Api-key": publicKey,
                "X-Signature": signatureHash,
            };

            let apiOccupanciesArr = [
                {
                    rooms: rooms?.length,
                    adults: 0,
                    children: 0,
                    paxes: [],
                },
            ];
            rooms?.forEach((item) => {
                apiOccupanciesArr[0].adults += Number(item?.noOfAdults) || 0;
                apiOccupanciesArr[0].children += Number(item?.noOfChildren) || 0;
                if (Number(item?.noOfChildren) > 0) {
                    apiOccupanciesArr[0].paxes.push(
                        ...item?.childrenAges?.map((age) => {
                            return {
                                type: "CH",
                                age,
                            };
                        })
                    );
                }
            });

            const body = {
                stay: {
                    checkIn: fromDate,
                    checkOut: toDate,
                },
                occupancies: apiOccupanciesArr,
                hotels: {
                    hotel: apiHotelCodes,
                },
                sourceMarket: nationality ? nationality?.toUpperCase() : null,
            };

            const axiosReq = axios.post(
                `${process.env.HOTEL_BEDS_URL}/hotel-api/1.0/hotels`,
                body,
                {
                    headers: headers,
                }
            );

            const hbRateCommentsReq = HotelHbRateComment.find({
                hotel: apiHotelCodes,
            }).lean();

            const [response, hbRateComments] = await Promise.all([axiosReq, hbRateCommentsReq]);

            // return [];

            // const response = {
            //     data: {
            //         hotels: {
            //             hotels: [EXAMPLEJSON[0]],
            //         },
            //     },
            // };

            // const hbRateComments = [EXAMPLEJSON[1]];

            const providerDetails = await B2BHotelProvider.findOne({
                name: "HotelBeds",
                isDeleted: false,
                isActive: true,
            });

            const hotelProviderId = providerDetails?._id?.toString();

            let hotelBedHotels = [];
            if (response.data.hotels.hotels && response.data.hotels.hotels?.length > 0) {
                function markupAddForRates(hotelAvailability) {
                    return new Promise(async (resolve, reject) => {
                        let apiRooms = [];
                        let minRateAdded = false;
                        let minRate = 0;
                        let minRateOffer = 0;
                        let maxRate = 0;

                        let roomCodes = hotelAvailability?.rooms?.map((item) => item?.code);

                        if (hotelAvailability?.rooms?.length > 0 && roomCodes?.length > 0) {
                            const roomTypes = await HotelBedRoomType.find({
                                hotel: hotelsWithHbId[hotelAvailability?.code]?._id,
                                hbId: { $in: roomCodes },
                                // isDeleted: false,
                                // isActive: true,
                            })
                                .populate("amenities", "name")
                                .lean();

                            if (roomTypes?.length > 0) {
                                for (let i = 0; i < hotelAvailability?.rooms?.length; i++) {
                                    const room = hotelAvailability?.rooms[i];

                                    let selRoomTypes = [];
                                    for (let m = 0; m < roomTypes?.length; m++) {
                                        if (roomTypes[m]?.hbId === room?.code) {
                                            selRoomTypes.push(roomTypes[m]);
                                        }
                                    }
                                    if (selRoomTypes?.length > 0) {
                                        for (let n = 0; n < selRoomTypes?.length; n++) {
                                            let apiRoom = {
                                                roomTypeId: selRoomTypes[n]?._id,
                                                roomName: room.name,
                                                code: room.code,
                                                provider: "HotelBeds",
                                                providerHotelId: hotelAvailability?.code,
                                                currency: hotelAvailability?.currency,
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
                                                        hotelsWithHbId[
                                                            hotelAvailability?.code
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
                                                                    hotelProviderId &&
                                                                tempRmType?.markup !== 0
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
                                                            hotelsWithHbId[hotelAvailability?.code]
                                                                ?.starCategory
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
                                                        hotelsWithHbId[
                                                            hotelAvailability?.code
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
                                                                    hotelProviderId &&
                                                                tempRmType?.markup !== 0
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
                                                            hotelsWithHbId[hotelAvailability?.code]
                                                                ?.starCategory
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
                                                            hotelsWithHbId[hotelAvailability?.code]
                                                                ?.starCategory
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
                                                                    hotelsWithHbId[
                                                                        hotelAvailability?.code
                                                                    ]?.starCategory
                                                                );
                                                            }
                                                        );
                                                }
                                            }

                                            for (
                                                let j = 0;
                                                j < hotelAvailability?.rooms[i]?.rates?.length;
                                                j++
                                            ) {
                                                let rate = hotelAvailability?.rooms[i]?.rates[j];
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
                                                                hotelAvailability?.code &&
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

                                                let netPriceAED = Number(rate?.net);
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

                                                rate.rateKeyRaw = rate?.rateKey;
                                                const hashedRateKey = md5(rate?.rateKey);
                                                rate.rateKey = hashedRateKey;

                                                apiRoom.rates.push({
                                                    provider: "Hotel Beds",
                                                    detailsKey: `${hotelProviderId}|${hotelAvailability?.code}|${apiRoom.roomTypeId}`,
                                                    rateKey: rate?.rateKey,
                                                    rateKeyRaw: rate?.rateKeyRaw,
                                                    rateName:
                                                        apiRoom?.roomType?.roomName +
                                                        " with " +
                                                        rate?.boardName?.toLowerCase(),
                                                    boardCode: rate?.boardCode,
                                                    boardName: rate?.boardName?.toLowerCase(),
                                                    selectedRoomOccupancies: [
                                                        {
                                                            occupancyId: undefined,
                                                            occupancyName:
                                                                hotelAvailability?.rooms[
                                                                    i
                                                                ]?.name?.toLowerCase(),
                                                            shortName: "",
                                                            count: rate?.rooms,
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
                                    hotelBedHotels.push({
                                        hotel: hotelsWithHbId[hotelAvailability?.code],
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

                function matchHotelBedsHotels(hotelAvailability) {
                    return new Promise(async (resolve, reject) => {
                        let apiRooms = [];
                        let minRateAdded = false;
                        let minRate = 0;
                        let minRateOffer = 0;
                        let maxRate = 0;

                        let roomCodes = hotelAvailability?.rooms?.map((item) => item?.code);

                        if (hotelAvailability?.rooms?.length > 0 && roomCodes?.length > 0) {
                            const roomTypes = await RoomType.find({
                                hotel: hotelsWithHbId[hotelAvailability?.code]?._id,
                                hotelBedRooms: { $in: roomCodes },
                                isDeleted: false,
                                isActive: true,
                            })
                                .populate("amenities", "name")
                                .lean();

                            if (roomTypes?.length > 0) {
                                for (let i = 0; i < hotelAvailability?.rooms?.length; i++) {
                                    const room = hotelAvailability?.rooms[i];

                                    let selRoomTypes = [];
                                    for (let m = 0; m < roomTypes?.length; m++) {
                                        if (roomTypes[m]?.hotelBedRooms?.includes(room?.code)) {
                                            selRoomTypes.push(roomTypes[m]);
                                        }
                                    }

                                    if (selRoomTypes?.length > 0) {
                                        for (let n = 0; n < selRoomTypes?.length; n++) {
                                            let apiRoom = {
                                                roomTypeId: selRoomTypes[n]?._id,
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
                                                        hotelsWithHbId[
                                                            hotelAvailability?.code
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
                                                                selRoomTypes[n]?._id.toString()
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
                                                            hotelsWithHbId[hotelAvailability?.code]
                                                                ?.starCategory
                                                        ) {
                                                            marketMarkup =
                                                                marketStrategy?.starCategory[mi];
                                                            break;
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
                                                        hotelsWithHbId[
                                                            hotelAvailability?.code
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
                                                                selRoomTypes[n]?._id.toString()
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
                                                            hotelsWithHbId[hotelAvailability?.code]
                                                                ?.starCategory
                                                        ) {
                                                            b2bMarkup =
                                                                profileMarkup?.starCategory[mi];
                                                            break;
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
                                                            hotelsWithHbId[hotelAvailability?.code]
                                                                ?.starCategory
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
                                                                    hotelsWithHbId[
                                                                        hotelAvailability?.code
                                                                    ]?.starCategory
                                                                );
                                                            }
                                                        );
                                                }
                                            }

                                            for (
                                                let j = 0;
                                                j < hotelAvailability?.rooms[i]?.rates?.length;
                                                j++
                                            ) {
                                                let rate = hotelAvailability?.rooms[i]?.rates[j];
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
                                                                hotelAvailability?.code &&
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

                                                let netPriceAED = Number(rate?.net);
                                                let priceWithMarkup = netPriceAED;

                                                let adminMarketMarkup = 0;
                                                if (
                                                    marketMarkup &&
                                                    !isNaN(marketMarkup.markupApi)
                                                ) {
                                                    if (marketMarkup.markupTypeApi === "flat") {
                                                        adminMarketMarkup =
                                                            marketMarkup.markupApi * noOfNights;
                                                    } else {
                                                        adminMarketMarkup =
                                                            (priceWithMarkup / 100) *
                                                            marketMarkup.markupApi;
                                                    }
                                                }
                                                priceWithMarkup += adminMarketMarkup;

                                                let adminB2bMarkup = 0;
                                                if (b2bMarkup && !isNaN(b2bMarkup.markupApi)) {
                                                    if (b2bMarkup.markupTypeApi === "flat") {
                                                        adminB2bMarkup =
                                                            b2bMarkup.markupApi * noOfNights;
                                                    } else {
                                                        adminB2bMarkup =
                                                            (priceWithMarkup / 100) *
                                                            b2bMarkup.markupApi;
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

                                                rate.rateKeyRaw = rate?.rateKey;
                                                const hashedRateKey = md5(rate?.rateKey);
                                                rate.rateKey = hashedRateKey;

                                                apiRoom.rates.push({
                                                    rateKey: rate?.rateKey,
                                                    rateKeyRaw: rate?.rateKeyRaw,
                                                    rateName:
                                                        apiRoom?.roomType?.roomName +
                                                        " with " +
                                                        rate?.boardName?.toLowerCase(),
                                                    boardCode: rate?.boardCode,
                                                    boardName: rate?.boardName?.toLowerCase(),
                                                    selectedRoomOccupancies: [
                                                        {
                                                            occupancyId: undefined,
                                                            occupancyName:
                                                                hotelAvailability?.rooms[
                                                                    i
                                                                ]?.name?.toLowerCase(),
                                                            shortName: "",
                                                            count: rate?.rooms,
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
                                    hotelBedHotels.push({
                                        hotel: hotelsWithHbId[hotelAvailability?.code],
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

                let promises = [];
                response.data.hotels.hotels?.forEach((hotelAvailability) => {
                    promises.push(markupAddForRates(hotelAvailability));
                });

                await Promise.all(promises);
            }
            console.timeEnd("hotel bed search");
            return { hotelBedHotels, hotelBedRowRes: response?.data };
        }

        return { hotelBedHotels: [], hotelBedRowRes: null };
    } catch (err) {
        console.log(err?.response?.data?.error);
        throw err;
    }
};

const getSingleHotelBedRate = async ({ rateKey, searchId, resellerId }) => {
    try {
        const utcDate = Math.floor(new Date().getTime() / 1000);
        const signature = publicKey + privateKey + utcDate;
        const signatureHash = crypto.createHash("sha256").update(signature).digest("hex");

        const url = `${process.env.HOTEL_BEDS_URL}/hotel-api/1.0/checkrates`;
        const headers = {
            "Api-key": publicKey,
            "X-Signature": signatureHash,
        };

        const body = {
            rooms: [
                {
                    rateKey,
                },
            ],
        };

        createHotelLog({
            stepNumber: 1002,
            actionUrl: url,
            request: body,
            response: "",
            processId: searchId,
            userId: resellerId,
        });

        const response = await axios.post(url, body, { headers });

        createHotelLog({
            stepNumber: 1003,
            actionUrl: url,
            request: "",
            response: response?.data,
            processId: searchId,
            userId: resellerId,
        });

        return response?.data?.hotel;
    } catch (err) {
        throw err;
    }
};

const createHotelBedBooking = async ({
    rateKey,
    travellerDetails,
    specialRequest,
    rooms,
    orderId,
    resellerId,
}) => {
    try {
        const utcDate = Math.floor(new Date().getTime() / 1000);
        const signature = publicKey + privateKey + utcDate;
        const signatureHash = crypto.createHash("sha256").update(signature).digest("hex");

        const url = `${process.env.HOTEL_BEDS_URL}/hotel-api/1.0/bookings`;
        const headers = {
            "Api-key": publicKey,
            "X-Signature": signatureHash,
        };

        const paxes = [];
        rooms.forEach((element, index) => {
            let travellerDetail = travellerDetails?.find((item) => item?.roomId === index + 1);

            Array.from({ length: element?.noOfAdults })?.map((_, adtIndex) => {
                paxes.push({
                    roomId: index + 1,
                    type: "AD",
                    name: adtIndex === 0 ? travellerDetail?.firstName : "",
                    surname: adtIndex === 0 ? travellerDetail?.lastName : "",
                });
            });
            Array.from({ length: element?.noOfChildren })?.map((_, arrIndex) => {
                rooms.forEach((_, ind) => {
                    paxes.push({
                        roomId: ind + 1,
                        type: "CH",
                        age: element.childrenAges[arrIndex],
                        name: "",
                        surname: "",
                    });
                });
            });
        });

        const body = {
            holder: {
                name: travellerDetails[0]?.firstName,
                surname: travellerDetails[0]?.lastName,
            },
            rooms: [
                {
                    rateKey,
                    paxes,
                },
            ],
            clientReference: process.env.COMPANY_NAME,
            remark: specialRequest,
            tolerance: 0,
        };

        createHotelLog({
            stepNumber: 3002,
            actionUrl: url,
            request: body,
            response: "",
            processId: orderId,
            userId: resellerId,
        });

        const response = await axios.post(url, body, { headers });

        createHotelLog({
            stepNumber: 3003,
            actionUrl: url,
            request: "",
            response: response?.data,
            processId: orderId,
            userId: resellerId,
        });

        return response.data?.booking;
    } catch (err) {
        console.log(err?.response?.data?.error);
        throw err;
    }
};

const cancelHotelBedBooking = async ({ bookingReference }) => {
    try {
        const utcDate = Math.floor(new Date().getTime() / 1000);
        const signature = publicKey + privateKey + utcDate;
        const signatureHash = crypto.createHash("sha256").update(signature).digest("hex");

        const headers = {
            "Api-key": publicKey,
            "X-Signature": signatureHash,
        };

        const cancelResp = await axios.delete(
            `${process.env.HOTEL_BEDS_URL}/hotel-api/1.0/bookings/${bookingReference}?cancellationFlag=CANCELLATION`,
            {
                headers,
            }
        );

        return cancelResp.data?.booking;
    } catch (err) {
        console.log(err);
        throw err;
    }
};

module.exports = {
    getAllHotelsHbAvailability,
    getSingleHotelBedAvailability,
    getSingleHotelBedRate,
    createHotelBedBooking,
    cancelHotelBedBooking,
};
