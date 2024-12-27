const { default: axios } = require("axios");
const OtiilaRoomType = require("../../../models/hotel/ottilaRoomType.model");
const B2BHotelProvider = require("../../models/hotel/b2bHotelProviders.model");

const { extractRoomCategoryInfo } = require("../../utils/string");
const { createHotelLog } = require("./hotelLogsHelpers");
const { addToJsonNestedFields } = require("../../utils/file");
const md5 = require("md5");

const OTTILA_BASE_URL = process.env.OTTILA_BASE_URL;
const PROXY_SERVER_URL = "https://api-server-i1.mytravellerschoice.com/proxy";
const config = {
    headers: {
        UserName: process.env.OTTILA_USERNAME,
        Password: process.env.OTTILA_PASSWORD,
        ccode: "1",
    },
};

const BOOKING_CANCEL_STATUS = {
    REQUESTED: {
        code: "XN",
        description: "Cancellation Requested (In this case, please contact our support team.)",
    },
    CANCELLED: { code: "XX", description: "Cancelled (Booking is cancelled successfully)" },
    CONFIRMED: {
        code: "KK",
        description:
            "(If you are going to cancel On Request booking(RQ), the system may return KK status if booking is getting confirmed at that time.)",
    },
};

function mergeObjects(arr, roomCount) {
    const merged = {};
    const highestRoomSrNo = {};
    arr.forEach((obj) => {
        const srNoLength = obj.RoomSrNo.split(",").length;
        const key = obj.RoomCategory + "-" + obj.Meal;

        if (obj.Available && !obj.PackageRate) {
            if (srNoLength === roomCount) {
                const tempKey = key + new Date();
                merged[tempKey] = {
                    ...obj,
                    RateKey: obj.RateKey,
                    Amount: obj.Amount * srNoLength,
                };
                highestRoomSrNo[tempKey] = 1;
            } else {
                if (!merged[key]) {
                    if (parseInt(obj.RoomSrNo) === 1) {
                        merged[key] = { ...obj, RateKey: obj.RateKey, Amount: obj.Amount };
                        highestRoomSrNo[key] = parseInt(obj.RoomSrNo);
                    }
                } else {
                    const currentRoomSrNo = parseInt(obj.RoomSrNo);
                    const expectedNextRoomSrNo = highestRoomSrNo[key] + 1;

                    if (currentRoomSrNo === expectedNextRoomSrNo) {
                        merged[key].Amount += obj.Amount;
                        if (!merged[key].RateKey.split(",").includes(obj.RateKey)) {
                            merged[key].RateKey += "," + obj.RateKey;
                        }
                        highestRoomSrNo[key]++; // Update highestRoomSrNo if the current room is in sequence
                    }
                }
            }
        }
    });

    return Object.values(merged);
}

const getOttilaHotelsAvailabilityByHCode = async ({
    fromDate,
    toDate,
    rooms,
    nationality,
    noOfNights,
    configuration,
    priceType,
    ottilaHotelCodes,
    hotelsWithOttilaId,
    resellerId,
}) => {
    try {
        if (
            ottilaHotelCodes?.length > 0 &&
            configuration?.showOttilaHotels === true &&
            priceType !== "static"
        ) {
            console.time("ottila search");

            // TODO:
            // we need ottila's cityId.
            // we need ottila's hotel codes.
            // we need nationality of client.

            let hCodes = ``;
            ottilaHotelCodes?.forEach((item, index) => {
                if (index === 0) hCodes += item;
                else hCodes += `,${item}`;
            });

            const body = {
                CityId: 989,
                NationalityId: "1",
                CheckInDate: fromDate,
                CheckOutDate: toDate,
                HCodes: hCodes,
                RoomDetail: rooms?.map((item, index) => {
                    return {
                        RoomSrNo: index + 1,
                        NoOfAdult: item?.noOfAdults,
                        NoOfChild: item?.noOfChildren,
                        ChildAges: item?.childrenAges,
                    };
                }),
            };

            const url = OTTILA_BASE_URL + "/XCon_Service/APIOut/Availability/1/HSearchByHCodes";

            // createHotelLog({
            //     stepNumber: 6001,
            //     actionUrl: url,
            //     request: body,
            //     response: "",
            //     processId: "",
            //     userId: resellerId,
            // });

            const response = await axios.post(PROXY_SERVER_URL, {
                url,
                headers: config.headers,
                ...body,
            });

            // createHotelLog({
            //     stepNumber: 6002,
            //     actionUrl: url,
            //     request: "",
            //     response: response.data,
            //     processId: "",
            //     userId: resellerId,
            // });

            // addToJsonNestedFields(body, "OTTILA.RAW_RESPONSE.REQUEST_BODY");

            // addToJsonNestedFields(response.data, "OTTILA.RAW_RESPONSE.RESPONSE_DATA");

            let ottilaHotels = [];
            if (response.data.Hotels && response.data.Hotels?.length > 0) {
                response.data.Hotels?.forEach((hotelAvailability) => {
                    let minRate = hotelAvailability?.Amount;
                    let minRateOffer = 0;
                    let maxRate = 0;

                    ottilaHotels.push({
                        hotel: hotelsWithOttilaId[hotelAvailability?.HCode],
                        rooms: [],
                        minRate,
                        maxRate,
                        totalOffer: minRateOffer,
                        noOfNights,
                    });
                });
            }
            console.timeEnd("ottila search");
            return { ottilaHotels };
        }

        return { ottilaHotels: [] };
    } catch (err) {
        console.log(err);
        throw err;
    }
};

const getSingleOttilaHotelAvailability = async ({
    fromDate,
    toDate,
    rooms,
    marketStrategy,
    profileMarkup,
    nationality,
    ottilaHotelCodes,
    hotelsWithOttilaId,
    noOfNights,
    clientMarkups,
    clientStarCategoryMarkups,
    subAgentMarkups,
    subAgentStarCategoryMarkups,
    reseller,
    configuration,
    priceType,
    resellerId,
}) => {
    try {
        if (
            ottilaHotelCodes?.length > 0 &&
            configuration?.showOttilaHotels === true &&
            priceType !== "static"
        ) {
            console.time("ottila search");

            let hCodes = ``;
            ottilaHotelCodes?.forEach((item, index) => {
                if (index === 0) hCodes += item;
                else hCodes += `,${item}`;
            });

            const body = {
                CityId: 989,
                NationalityId: "1",
                CheckInDate: fromDate,
                CheckOutDate: toDate,
                HCode: hCodes,
                RoomDetail: rooms?.map((item, index) => {
                    return {
                        RoomSrNo: index + 1,
                        NoOfAdult: item?.noOfAdults,
                        NoOfChild: item?.noOfChildren,
                        ChildAges: item?.childrenAges,
                    };
                }),
            };

            const url =
                OTTILA_BASE_URL + "/XCon_Service/APIOut/Availability/1/HSearchByHotelCode_V2";

            // createHotelLog({
            //     stepNumber: 7001,
            //     actionUrl: url,
            //     request: body,
            //     response: "",
            //     processId: "",
            //     userId: resellerId,
            // });

            const response = await axios.post(PROXY_SERVER_URL, {
                url,
                ...body,
                headers: config.headers,
            });

            // createHotelLog({
            //     stepNumber: 7002,
            //     actionUrl: url,
            //     request: "",
            //     response: response?.data,
            //     processId: "",
            //     userId: resellerId,
            // });

            // const response = {
            //     data: EXAMPLEJSON,
            // };

            const providerDetails = await B2BHotelProvider.findOne({
                name: "Ottila",
                isDeleted: false,
                isActive: true,
            });

            const hotelProviderId = providerDetails?._id?.toString();

            let ottilaHotels = [];
            const hbRateComments = [];
            if (
                providerDetails &&
                response.data.TokenId &&
                response.data?.Hotels &&
                response.data.Hotels.length > 0
            ) {
                // const hbRateComments = await HotelHbRateComment.find({
                //     hotel: apiHotelCodes,
                // }).lean();

                const TokenId = response.data.TokenId;
                function markupAddForRates(hotelAvailability) {
                    if (!providerDetails.configurations.hasRoomTypeAvailable) {
                        return new Promise(async (resolve, reject) => {
                            let apiRates = [];
                            let minRateAdded = false;
                            let minRate = 0;
                            let minRateOffer = 0;
                            let maxRate = 0;

                            if (hotelAvailability?.VendorList?.length) {
                                let marketMarkup;
                                let b2bMarkup;

                                const findHotelMarkup = (strategy, providerId) => {
                                    const hotelDetails = strategy?.hotel?.find(
                                        (hotel) =>
                                            hotel?.hotelId?.toString() ===
                                            hotelsWithOttilaId[
                                                hotelAvailability?.HCode
                                            ]?._id?.toString()
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
                                        const starCategoryDetails =
                                            marketStrategy?.starCategory?.find(
                                                (starCat) =>
                                                    starCat?.name ===
                                                    hotelsWithOttilaId[hotelAvailability?.HCode]
                                                        ?.starCategory
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
                                        const starCategoryDetails =
                                            profileMarkup?.starCategory.find(
                                                (starCat) =>
                                                    starCat?.name ===
                                                    hotelsWithOttilaId[hotelAvailability?.HCode]
                                                        ?.starCategory
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
                                //                 hotelsWithOttilaId[hotelAvailability?.HCode]
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
                                        subAgentMarkup = subAgentStarCategoryMarkups?.find(
                                            (item) => {
                                                return (
                                                    item?.name ===
                                                    hotelsWithOttilaId[hotelAvailability?.HCode]
                                                        ?.starCategory
                                                );
                                            }
                                        );
                                    }
                                }

                                for (const vendor of hotelAvailability.VendorList) {
                                    const rates = vendor.RateDetails;
                                    const HKey = vendor.HKey;
                                    const filteredRates =
                                        body?.RoomDetail?.length < 2
                                            ? [...rates]
                                            : mergeObjects(rates, body?.RoomDetail?.length);
                                    for (const rate of filteredRates) {
                                        const {
                                            RoomCategory,
                                            Meal,
                                            RateKey,
                                            Amount,
                                            PackageRate,
                                            Available,
                                        } = rate;

                                        if (Available && !PackageRate) {
                                            const { roomName, bed } =
                                                extractRoomCategoryInfo(RoomCategory);

                                            let apiRateDetails = {
                                                // roomTypeId: selRoomTypes[n]?._id,
                                                roomName: roomName || RoomCategory,
                                                boardBasis: Meal,
                                                // code: room?.HKey,
                                                provider: "Ottila",
                                                providerHotelId: hotelAvailability?.HCode,
                                                currency: response?.data?.Currency,
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

                                            let netPriceAED = Number(Amount);

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
                                                    adminB2bMarkup = b2bMarkup.markup * noOfNights;
                                                } else {
                                                    adminB2bMarkup =
                                                        (priceWithMarkup / 100) * b2bMarkup.markup;
                                                }
                                            }
                                            priceWithMarkup += adminB2bMarkup;

                                            let saMarkup = 0;
                                            if (subAgentMarkup && !isNaN(subAgentMarkup.markup)) {
                                                if (subAgentMarkup.markupType === "flat") {
                                                    saMarkup = subAgentMarkup.markup * noOfNights;
                                                } else {
                                                    saMarkup =
                                                        (priceWithMarkup / 100) *
                                                        subAgentMarkup.markup;
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

                                            const totalOffer =
                                                rate?.offers?.reduce(
                                                    (a, b) => a + Math.abs(b?.amount),
                                                    0
                                                ) || 0;

                                            rate.rateKeyRaw = RateKey;
                                            const hashedRateKey = md5(RateKey);
                                            rate.rateKey = hashedRateKey;

                                            apiRateDetails.rates.push({
                                                provider: "Ottila",
                                                detailsKey: `${hotelProviderId}|${hotelAvailability?.HCode}|''|${PackageRate}`,
                                                rateInfo: {
                                                    roomCategory: RoomCategory,
                                                    cityId: body.CityId,
                                                    nationalityId: body.NationalityId,
                                                    checkInDate: body.CheckInDate,
                                                    checkOutDate: body.CheckOutDate,
                                                    hCode: body.HCode,
                                                    roomDetail: body.RoomDetail,
                                                    perRoomAmount: Amount,
                                                    actions: [
                                                        {
                                                            type: "v2-res",
                                                            tokenId: TokenId,
                                                            hKey: HKey,
                                                        },
                                                    ],
                                                },
                                                rateKey: rate?.rateKey,
                                                rateKeyRaw: rate?.rateKeyRaw,
                                                rateName:
                                                    apiRateDetails.roomName +
                                                    " with " +
                                                    rate?.Meal?.toLowerCase(),
                                                boardCode: rate?.boardCode,
                                                boardName:
                                                    rate?.boardName?.toLowerCase() ||
                                                    Meal?.toLowerCase(),
                                                selectedRoomOccupancies: [
                                                    {
                                                        occupancyId: undefined,
                                                        occupancyName:
                                                            vendor?.name?.toLowerCase() ||
                                                            bed?.type ||
                                                            "",
                                                        shortName: bed?.typeShort || "",
                                                        count: rate?.rooms || bed?.count || 0,
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

                                            apiRates.push(apiRateDetails);
                                        }
                                    }
                                }
                                if (apiRates?.length > 0) {
                                    ottilaHotels.push({
                                        hotel: hotelsWithOttilaId[hotelAvailability?.HCode],
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

                            let roomCodes = hotelAvailability?.VendorList?.map(
                                (item) => item?.HKey
                            );

                            if (
                                hotelAvailability?.VendorList?.length > 0 &&
                                roomCodes?.length > 0
                            ) {
                                const roomTypes = await OtiilaRoomType.find({
                                    hotel: hotelsWithOttilaId[hotelAvailability?.HCode]?._id,
                                    ottilaId: { $in: roomCodes },
                                    // isDeleted: false,
                                    // isActive: true,
                                })
                                    .populate("amenities", "name")
                                    .lean();

                                if (roomTypes?.length > 0) {
                                    for (
                                        let i = 0;
                                        i < hotelAvailability?.VendorList?.length;
                                        i++
                                    ) {
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
                                                            hotelsWithOttilaId[
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
                                                            mi <
                                                            marketStrategy?.starCategory?.length;
                                                            mi++
                                                        ) {
                                                            if (
                                                                marketStrategy?.starCategory[mi]
                                                                    ?.name ===
                                                                hotelsWithOttilaId[
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
                                                                        marketStrategy
                                                                            ?.starCategory[mi]
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
                                                            hotelsWithOttilaId[
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
                                                                    profileMarkup?.hotel[mi]
                                                                        ?.roomTypes[mj];
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
                                                            mi <
                                                            profileMarkup?.starCategory?.length;
                                                            mi++
                                                        ) {
                                                            if (
                                                                profileMarkup?.starCategory[mi]
                                                                    ?.name ===
                                                                hotelsWithOttilaId[
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
                                                                        profileMarkup?.starCategory[
                                                                            mi
                                                                        ]?.markups[mj];
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
                                                                hotelsWithOttilaId[
                                                                    hotelAvailability?.HCode
                                                                ]?.starCategory
                                                            );
                                                        }
                                                    );
                                                }
                                                let subAgentMarkup;
                                                if (reseller?.role === "sub-agent") {
                                                    subAgentMarkup = subAgentMarkups?.find(
                                                        (item) => {
                                                            return (
                                                                item?.roomTypeId?.toString() ===
                                                                selRoomTypes[n]?._id?.toString()
                                                            );
                                                        }
                                                    );
                                                    if (!subAgentMarkup) {
                                                        subAgentMarkup =
                                                            subAgentStarCategoryMarkups?.find(
                                                                (item) => {
                                                                    return (
                                                                        item?.name ===
                                                                        hotelsWithOttilaId[
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
                                                    let rate =
                                                        hotelAvailability?.VendorList[i]
                                                            ?.RateDetails[j];
                                                    // if (rate?.rateType === "RECHECK" && 1 === 2) {
                                                    //     const newRateRes = await getSingleHotelBedRate({
                                                    //         rateKey: rate?.rateKey,
                                                    //     });
                                                    //     if (newRateRes[0]?.rooms[0]?.rates[0]) {
                                                    //         rate = hotelAvailability?.rooms[i]?.rates[j];
                                                    //         rate.rateComments = [rate.rateComments];
                                                    //     }
                                                    // }

                                                    if (
                                                        rate?.rateCommentsId &&
                                                        !rate?.rateComments
                                                    ) {
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
                                                    if (
                                                        marketMarkup &&
                                                        !isNaN(marketMarkup.markup)
                                                    ) {
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
                                                    if (
                                                        clientMarkup &&
                                                        !isNaN(clientMarkup.markup)
                                                    ) {
                                                        if (clientMarkup.markupType === "flat") {
                                                            clMarkup =
                                                                clientMarkup.markup * noOfNights;
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
                                                            rate?.cancellationPolicies?.map(
                                                                (item) => {
                                                                    return `If you cancel this booking from ${item?.from} you will be charged ${item?.amount} AED.`;
                                                                }
                                                            ),
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
                                        ottilaHotels.push({
                                            hotel: hotelsWithOttilaId[hotelAvailability?.HCode],
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

                                                apiRoom.rates.push({
                                                    rateKey: rate?.rateKey,
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
                response.data.Hotels?.forEach((hotelAvailability) => {
                    promises.push(markupAddForRates(hotelAvailability));
                });

                await Promise.all(promises);
            }
            console.timeEnd("ottila search");
            return { ottilaHotels };
        }

        return { ottilaHotels: [] };
    } catch (err) {
        console.log(err?.response?.data?.error);
        throw err;
    }
};

const createOttilaPreBooking = async (rateInfo, rateKey, orderId, resellerId) => {
    const v2Res = rateInfo.actions.find((action) => action.type === "v2-res");

    const splitedRateKeys = rateKey?.split(",");

    if (splitedRateKeys.length === rateInfo?.roomDetail.length) {
        rateInfo?.roomDetail?.forEach((room, index) => {
            rateInfo.roomDetail[index].RateKey = splitedRateKeys[index];
        });
    } else if (splitedRateKeys.length === 1) {
        rateInfo.roomDetail?.forEach((room, index) => {
            rateInfo.roomDetail[index].RateKey = splitedRateKeys[0];
        });
    } else {
        return Promise.reject("RateKey and rooms mismatch!");
    }

    const reqBody = {
        CityId: rateInfo?.cityId,
        NationalityId: rateInfo?.nationalityId,
        CheckInDate: rateInfo?.checkInDate,
        CheckOutDate: rateInfo?.checkOutDate,
        HCode: rateInfo?.hCode,
        TokenId: v2Res?.tokenId,
        HKey: v2Res?.hKey,
        RoomDetail: rateInfo?.roomDetail?.map((rate) => ({ ...rate })),
    };

    const url = OTTILA_BASE_URL + "/XCon_Service/APIOut/Availability/1/HPreBooking";

    createHotelLog({
        stepNumber: 4001,
        actionUrl: url,
        request: reqBody,
        response: "",
        processId: rateKey,
        userId: resellerId,
    });

    try {
        const response = await axios.post(PROXY_SERVER_URL, {
            url,
            headers: config.headers,
            ...reqBody,
        });

        createHotelLog({
            stepNumber: 4002,
            actionUrl: url,
            request: "",
            response: response?.data,
            processId: rateKey,
            userId: resellerId,
        });

        if (response.data?.Error_Code)
            return Promise.reject(response?.data?.Error_Msg || response?.data?.Error);

        return response.data;
    } catch (error) {
        Promise.reject(error);
    }
};

const createOttilaBooking = async (
    rateInfo,
    rateKey,
    clientRefNo,
    travellerDetails,
    rooms,
    orderId,
    resellerId
) => {
    const preBokkingRes = rateInfo.actions.find((action) => action.type === "pre-booking");

    const roomDetails = rateInfo?.toObject()?.roomDetail;

    let paxDetails = {};
    roomDetails.forEach((element, index) => {
        paxDetails = {
            ...paxDetails,
            [index]: {
                paxes: [...(paxDetails[index]?.paxes || [])],
            },
        };
        let travellerDetailAdults = travellerDetails?.filter(
            (item) => item?.roomId === index + 1 && item?.type === "adult"
        );
        let travellerDetailChilds = travellerDetails?.filter(
            (item) => item?.roomId === index + 1 && item?.type === "child"
        );

        Array.from({ length: element?.NoOfAdult })?.map((_, adtIndex) => {
            paxDetails[index].paxes.push({
                PaxSrNo: adtIndex + 1,
                Title:
                    travellerDetailAdults[adtIndex] &&
                    travellerDetailAdults[adtIndex]?.title === "mr"
                        ? "Mr."
                        : "Miss" || "",
                FirstName:
                    (travellerDetailAdults[adtIndex] &&
                        travellerDetailAdults[adtIndex]?.firstName) ||
                    "",
                LastName:
                    (travellerDetailAdults[adtIndex] &&
                        travellerDetailAdults[adtIndex]?.lastName) ||
                    "",
                IsChild: false,
            });
        });
        Array.from({ length: element?.NoOfChild })?.map((_, arrIndex) => {
            paxDetails[index].paxes.push({
                PaxSrNo: paxDetails[index].paxes.length + 1,
                Title:
                    (travellerDetailChilds[arrIndex] &&
                        (travellerDetailChilds[arrIndex]?.title === "mr" ? "Mr." : "Miss")) ||
                    "",
                FirstName:
                    (travellerDetailChilds[arrIndex] &&
                        travellerDetailChilds[arrIndex]?.firstName) ||
                    "",
                LastName:
                    (travellerDetailChilds[arrIndex] &&
                        travellerDetailChilds[arrIndex]?.lastName) ||
                    "",
                IsChild: true,
                ChildAge: element.ChildAges[arrIndex],
            });
        });
    });

    const reqBody = {
        CityId: rateInfo?.cityId,
        NationalityId: rateInfo?.nationalityId,
        CheckInDate: rateInfo?.checkInDate,
        CheckOutDate: rateInfo?.checkOutDate,
        HCode: rateInfo?.hCode,
        TokenId: preBokkingRes?.tokenId,
        HKey: preBokkingRes?.hKey,
        ClientRefNo: clientRefNo,
        ExpectedAmount: rateInfo?.amount,
        VoucherBooking: "true",
        RoomDetail: roomDetails?.map((rate, index) => ({
            RoomSrNo: rate.RoomSrNo,
            NoOfAdult: rate.NoOfAdult,
            NoOfChild: rate.NoOfChild,
            ChildAges: rate.ChildAges,
            RateKey: rate.RateKey,
            PaxDetails: paxDetails[index].paxes,
        })),
    };

    const url = OTTILA_BASE_URL + "/XCon_Service/APIOut/Booking/1/HCreateBooking";

    createHotelLog({
        stepNumber: 3005,
        actionUrl: url,
        request: reqBody,
        response: "",
        processId: orderId,
        userId: resellerId,
    });

    try {
        const response = await axios.post(PROXY_SERVER_URL, {
            url,
            headers: config.headers,
            ...reqBody,
        });

        createHotelLog({
            stepNumber: 3006,
            actionUrl: url,
            request: "",
            response: response?.data,
            processId: orderId,
            userId: resellerId,
        });

        if (response.data?.Error_Code)
            return Promise.reject(response?.data?.Error_Msg || response?.data?.Error);

        return response.data;
    } catch (error) {
        Promise.reject(error);
    }
};

const cancelOttilaHotelBooking = async (apiRefNo, orderId, resellerId) => {
    const body = {
        APIRefNo: apiRefNo,
    };

    const url = OTTILA_BASE_URL + "/XCon_Service/APIOut/Actions/1/HCancelBooking";

    createHotelLog({
        stepNumber: 5001,
        actionUrl: url,
        request: body,
        response: "",
        processId: orderId,
        userId: resellerId,
    });

    try {
        const response = await axios.post(PROXY_SERVER_URL, {
            url,
            headers: config.headers,
            ...body,
        });
        if (response.data?.Error_Code)
            return Promise.reject(response?.data?.Error_Msg || response?.data?.Error);

        createHotelLog({
            stepNumber: 5002,
            actionUrl: url,
            request: "",
            response: response.data,
            processId: orderId,
            userId: resellerId,
        });

        return response.data;
    } catch (error) {
        Promise.reject(error);
    }
};

module.exports = {
    getOttilaHotelsAvailabilityByHCode,
    getSingleOttilaHotelAvailability,
    createOttilaPreBooking,
    createOttilaBooking,
    cancelOttilaHotelBooking,
    BOOKING_CANCEL_STATUS,
};
