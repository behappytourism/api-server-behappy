const axios = require("axios");
const crypto = require("crypto");

const { HotelHbRateComment, RoomType } = require("../../models/hotel");
const { createHotelLog } = require("./hotelLogsHelpers");

const publicKey = process.env.HOTEL_BEDS_API_KEY;
const privateKey = process.env.HOTEL_BEDS_SECRET;

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

            console.log("responded hotels ", response.data.hotels.hotels?.length);

            let hotelBedHotels = [];
            if (response.data.hotels.hotels && response.data.hotels.hotels?.length > 0) {
                // const hbRateComments = await HotelHbRateComment.find({
                //     hotel: apiHotelCodes,
                // }).lean();

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

                                            // let clientMarkup = clientMarkups?.find((item) => {
                                            //     return (
                                            //         item?.roomTypeId?.toString() ===
                                            //         selRoomTypes[n]?._id?.toString()
                                            //     );
                                            // });
                                            // if (!clientMarkup) {
                                            //     clientMarkup = clientStarCategoryMarkups?.find(
                                            //         (item) => {
                                            //             return (
                                            //                 item?.name ===
                                            //                 hotelsWithHbId[hotelAvailability?.code]
                                            //                     ?.starCategory
                                            //             );
                                            //         }
                                            //     );
                                            // }

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

                                               

                                                // let clMarkup = 0;
                                                // if (clientMarkup && !isNaN(clientMarkup.markup)) {
                                                //     if (clientMarkup.markupType === "flat") {
                                                //         clMarkup = clientMarkup.markup * noOfNights;
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
                response.data.hotels.hotels?.forEach((hotelAvailability) => {
                    promises.push(matchHotelBedsHotels(hotelAvailability));
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
