const logger = require("../../../logger");
const { Area } = require("../../../models/global");
const { Hotel, RoomType } = require("../../../models/hotel");

module.exports = {
    saveSingleHotel: async ({
        hotel,
        countriesWithKey,
        statesWithKey,
        boardsWithKey,
        accommodationTypesWithKey,
        roomTypesWithKey,
        amenitiesWithKey,
        citiesWithKey,
        hotelChainsWithKey,
    }) => {
        try {
            let countryCode = hotel?.countryCode === "UK" ? "GB" : hotel?.countryCode;
            if (!countriesWithKey[countryCode]) {
                logger.error(`'${countryCode}' country not found - ${hotel?.code}`);
                return;
            }

            if (!statesWithKey[`${countriesWithKey[countryCode]?._id}${hotel?.stateCode}`]) {
                logger.error(`'${hotel?.stateCode}' state not found - ${hotel?.code}`);
                return;
            }

            if (
                !citiesWithKey[
                    `${countriesWithKey[countryCode]?._id}${hotel?.destinationCode}`
                ]
            ) {
                logger.error(`'${hotel?.destinationCode}' destination not found - ${hotel?.code}`);
                return;
            }

            if (!accommodationTypesWithKey[hotel?.accommodationTypeCode]) {
                logger.error(
                    `'${hotel?.accommodationTypeCode}' accommodation type not found - ${hotel?.code}`
                );
                return;
            }

            let areaId;
            if (hotel?.zoneCode) {
                const dbArea = await Area.findOne({
                    areaCode: hotel?.zoneCode,
                    city: citiesWithKey[
                        `${countriesWithKey[countryCode]?._id}${hotel?.destinationCode}`
                    ]?._id,
                    isDeleted: false,
                });
                if (dbArea) {
                    areaId = dbArea?._id;
                } else {
                    logger.error(
                        `area ${hotel?.zoneCode} not found in ${hotel?.destinationCode}, ${countryCode} `
                    );
                }
            }

            // if (!hotelChainsWithKey[hotel?.chainCode]) {
            //     logger.error(`'${hotel?.chainCode}' hotel chain not found`);
            // }

            const boardTypesIds = [];
            for (let k = 0; k < hotel?.boardCodes?.length; k++) {
                if (!boardsWithKey[hotel?.boardCodes[k]]) {
                    logger.error(`'${hotel?.boardCodes[k]}' board type not found - ${hotel?.code}`);
                } else {
                    boardTypesIds.push(boardsWithKey[hotel?.boardCodes[k]]?._id);
                }
            }

            let sortedHotelImages = hotel?.images?.sort((a, b) => {
                return a.order - b.order;
            });
            let imgUrl = "https://photos.hotelbeds.com/giata/original/";
            let genImages = [];
            let terImgaes = [];
            let poolImages = [];
            let otherImages = [];
            let roomImages = [];
            let roomImagesWithKey = {};
            for (let k = 0; k < sortedHotelImages?.length; k++) {
                if (sortedHotelImages[k]?.imageTypeCode === "GEN") {
                    genImages.push({
                        path: imgUrl + sortedHotelImages[k]?.path,
                        isRelative: false,
                    });
                } else if (sortedHotelImages[k]?.imageTypeCode === "TER") {
                    terImgaes.push({
                        path: imgUrl + sortedHotelImages[k]?.path,
                        isRelative: false,
                    });
                } else if (sortedHotelImages[k]?.imageTypeCode === "HAB") {
                    roomImages.push({
                        path: imgUrl + sortedHotelImages[k]?.path,
                        isRelative: false,
                    });
                    if (roomImagesWithKey[sortedHotelImages[k]?.roomCode]) {
                        roomImagesWithKey[sortedHotelImages[k]?.roomCode].push({
                            path: imgUrl + sortedHotelImages[k]?.path,
                            isRelative: false,
                        });
                    } else {
                        roomImagesWithKey[sortedHotelImages[k]?.roomCode] = [
                            {
                                path: imgUrl + sortedHotelImages[k]?.path,
                                isRelative: false,
                            },
                        ];
                    }
                } else if (sortedHotelImages[k]?.imageTypeCode === "PIS") {
                    poolImages.push({
                        path: imgUrl + sortedHotelImages[k]?.path,
                        isRelative: false,
                    });
                } else {
                    otherImages.push({
                        path: imgUrl + sortedHotelImages[k]?.path,
                        isRelative: false,
                    });
                }
            }

            let starCategory =
                hotel?.categoryCode === "5EST" ||
                hotel?.categoryCode === "5LUX" ||
                hotel?.categoryCode === "HR5"
                    ? "5"
                    : hotel?.categoryCode === "4EST" ||
                      hotel?.categoryCode === "4LUX" ||
                      hotel?.categoryCode === "HR4"
                    ? "4"
                    : hotel?.categoryCode === "3EST" || hotel?.categoryCode === "HR3"
                    ? "3"
                    : hotel?.categoryCode === "2EST" || hotel?.categoryCode === "HR2"
                    ? "2"
                    : hotel?.categoryCode === "1EST"
                    ? "1"
                    : hotel?.categoryCode === "AG" ||
                      hotel?.categoryCode === "APTH" ||
                      hotel?.categoryCode === "APTH2" ||
                      hotel?.categoryCode === "APTH3" ||
                      hotel?.categoryCode === "APTH4" ||
                      hotel?.categoryCode === "APTH5" ||
                      hotel?.categoryCode === "AT1" ||
                      hotel?.categoryCode === "AT2" ||
                      hotel?.categoryCode === "AT3" ||
                      hotel?.categoryCode === "AT3"
                    ? "apartment"
                    : hotel?.categoryCode === "ALBER" ||
                      hotel?.categoryCode === "HS" ||
                      hotel?.categoryCode === "HS2" ||
                      hotel?.categoryCode === "HS3" ||
                      hotel?.categoryCode === "HS4" ||
                      hotel?.categoryCode === "HS5" ||
                      hotel?.categoryCode === "HSR1" ||
                      hotel?.categoryCode === "HSR2"
                    ? "hostel"
                    : "unrated";

            let amenities = [];
            for (let k = 0; k < hotel?.facilities?.length; k++) {
                if (amenitiesWithKey[hotel?.facilities[k]?.facilityCode]) {
                    amenities.push({
                        amenity: amenitiesWithKey[hotel?.facilities[k]?.facilityCode]?._id,
                        amenityGroup:
                            amenitiesWithKey[hotel?.facilities[k]?.facilityCode]?.parentAmenity,
                        isFeatured: false,
                        ageFrom: hotel?.facilities[k]?.ageFrom || null,
                        ageTo: hotel?.facilities[k]?.ageTo || null,
                        isPaid: hotel?.facilities[k]?.indFee || false,
                        amount: hotel?.facilities[k]?.amount || null,
                        applicationType: hotel?.facilities[k]?.applicationType || null,
                        currency: hotel?.facilities[k]?.currency || null,
                        dateFrom: hotel?.facilities[k]?.dateFrom || null,
                        dateTo: hotel?.facilities[k]?.dateTo || null,
                        description: hotel?.facilities[k]?.content || null,
                        distance: hotel?.facilities[k]?.distance || null,
                        order: hotel?.facilities[k]?.order || null,
                        timeFrom: hotel?.facilities[k]?.timeFrom || null,
                        timeTo: hotel?.facilities[k]?.timeTo || null,
                        isVoucher: hotel?.facilities[k]?.voucher || false,
                    });
                }
            }

            let reservationsContacts = [];
            let hotelContacts = [];
            for (let i = 0; i < hotel.phones?.length; i++) {
                if (hotel.phones[i]?.phoneType === "PHONEBOOKING") {
                    reservationsContacts.push({
                        name: "Partner",
                        position: "Reservation Manager",
                        country: countriesWithKey[countryCode]?._id,
                        phoneNumber: hotel.phones[i]?.phoneNumber,
                        email: hotel.email ? hotel.email?.toLowerCase() : "",
                    });
                } else if (hotel.phones[i]?.phoneType === "PHONEHOTEL") {
                    hotelContacts.push({
                        name: "Hotel",
                        position: "Hotel",
                        country: countriesWithKey[countryCode]?._id,
                        phoneNumber: hotel.phones[i]?.phoneNumber,
                        email: hotel.email ? hotel.email?.toLowerCase() : "",
                    });
                }
            }

            console.log("adding hotel ", hotel?.code);

            if (hotel?.code) {
                const existingHotel = await Hotel.findOne({ hbId: hotel?.code });
                let myHotel;
                if (existingHotel) {
                    console.log("No area... Updating Hotel");
                    // myHotel = await Hotel.findOneAndUpdate(
                    //     {
                    //         hbId: hotel?.code,
                    //     },
                    //     {
                    //         // hbId: hotel?.code,
                    //         // hotelName: hotel?.name?.content,
                    //         // address: hotel?.address?.content,
                    //         // street: hotel?.address?.street,
                    //         // country: countriesWithKey[countryCode]?._id,
                    //         // state: statesWithKey[`${countriesWithKey[countryCode]?._id}${hotel?.stateCode}`]?._id,
                    //         // city: citiesWithKey[`${countriesWithKey[countryCode]?._id}${hotel?.destinationCode}`]?._id,
                    //         area: areaId,
                    //         // geoCode: hotel?.coordinates,
                    //         // checkInTime: "12:00",
                    //         // checkOutTime: "14:00",
                    //         // postalCode: hotel?.postalCode  || "",
                    //         // amenities,
                    //         // website: hotel?.web,
                    //         // starCategory,
                    //         // images: [
                    //         //     ...genImages,
                    //         //     ...roomImages,
                    //         //     ...terImgaes,
                    //         //     ...poolImages,
                    //         //     ...otherImages,
                    //         // ],
                    //         // description: hotel?.description?.content,
                    //         // openDays: [
                    //         //     "sunday",
                    //         //     "monday",
                    //         //     "tuesday",
                    //         //     "wednesday",
                    //         //     "thursday",
                    //         //     "friday",
                    //         //     "saturday",
                    //         // ],
                    //         // boardTypes: boardTypesIds,
                    //         // accommodationType:
                    //         //     accommodationTypesWithKey[hotel?.accommodationTypeCode]?._id,
                    //         // hotelChain: hotelChainsWithKey[hotel?.chainCode]?._id,
                    //         // isApiConnected: true,
                    //         // connectedApis: [],
                    //     },
                    //     { runValidators: true, new: true }
                    // );
                } else {
                    console.log("Creating Hotel..!");
                    myHotel = new Hotel({
                        hbId: hotel?.code,
                        hotelName: hotel?.name?.content,
                        address: hotel?.address?.content,
                        street: hotel?.address?.street,
                        postalCode: !isNaN(hotel?.postalCode) ? hotel?.postalCode : null,
                        country: countriesWithKey[countryCode]?._id,
                        state: statesWithKey[
                            `${countriesWithKey[countryCode]?._id}${hotel?.stateCode}`
                        ]?._id,
                        city: citiesWithKey[
                            `${countriesWithKey[countryCode]?._id}${hotel?.destinationCode}`
                        ]?._id,
                        area: areaId,
                        geoCode: hotel?.coordinates,
                        checkInTime: "12:00",
                        checkOutTime: "14:00",
                        amenities,
                        website: hotel?.web,
                        starCategory,
                        images: [
                            ...genImages,
                            ...roomImages,
                            ...terImgaes,
                            ...poolImages,
                            ...otherImages,
                        ],
                        description: hotel?.description?.content,
                        openDays: [
                            "sunday",
                            "monday",
                            "tuesday",
                            "wednesday",
                            "thursday",
                            "friday",
                            "saturday",
                        ],
                        boardTypes: boardTypesIds,
                        accommodationType:
                            accommodationTypesWithKey[hotel?.accommodationTypeCode]?._id,
                        hotelChain: hotelChainsWithKey[hotel?.chainCode]?._id || null,
                        isApiConnected: true,
                        isActive: true,
                        isContractAvailable: false,
                        isPublished: true,
                        connectedApis: [],
                        hotelLoadedFrom: "hotel-bed",
                        hotelContacts,
                        reservationsContacts,
                    });
                    await myHotel.save();

                    let mainRoomTypesUpsertArr = [];
                    let roomTypeUpsertArr = [];
                    for (let k = 0; k < hotel?.rooms?.length; k++) {
                        const room = hotel?.rooms[k];

                        if (!roomTypesWithKey[room?.roomCode]) {
                            logger.error(
                                `'${room?.roomCode}' room type not found - ${hotel?.code}`
                            );
                            continue;
                        }

                        let roomAmenities = [];
                        if (room?.roomFacilities?.length > 0) {
                            for (let l = 0; l < room?.roomFacilities?.length; l++) {
                                if (amenitiesWithKey[room?.roomFacilities[l]?.facilityCode]) {
                                    roomAmenities.push(
                                        amenitiesWithKey[room?.roomFacilities[l]?.facilityCode]?._id
                                    );
                                }
                            }
                        }

                        if (roomTypesWithKey[room?.roomCode]?.roomName) {
                            roomTypeUpsertArr.push({
                                updateOne: {
                                    filter: { hotel: myHotel?._id, hbId: room?.roomCode },
                                    update: {
                                        hotel: myHotel?._id,
                                        hbId: room?.roomCode,
                                        roomName:
                                            roomTypesWithKey[
                                                room?.roomCode
                                            ]?.roomName?.toLowerCase(),
                                        isParentRoom: room?.isParentRoom,
                                        minPax: room?.minPax,
                                        maxPax: room?.maxPax,
                                        maxAdults: room?.maxAdults,
                                        maxChildren: room?.maxChildren,
                                        minAdults: room?.minAdults,
                                        isRelative: true,
                                        images: roomImagesWithKey[room?.roomCode] || [],
                                        amenities: roomAmenities,
                                    },
                                    upsert: true,
                                },
                            });
                            mainRoomTypesUpsertArr.push({
                                hotel: myHotel?._id,
                                roomName: roomTypesWithKey[room?.roomCode]?.roomName?.toLowerCase(),
                                serviceBy: "NIGHT",
                                roomOccupancies: [],
                                infantAgeFrom: 0,
                                infantAgeTo: 5.99,
                                childAgeFrom: 6,
                                childAgeTo: 11.99,
                                adultAgeFrom: 12,
                                adultAgeTo: 999,
                                amenities: roomAmenities,
                                images: roomImagesWithKey[room?.roomCode] || [],
                                hotelBedRooms: [room?.roomCode],
                                isActive: true,
                                hotelLoadedFrom: "hotel-bed",
                                tempString: "HB-2023-09-25",
                            });
                        }
                    }

                    logger.info("Creating " + mainRoomTypesUpsertArr?.length + " roomTypes");
                    // await HotelBedRoomType.bulkWrite([...roomTypeUpsertArr]);
                    await RoomType.create([...mainRoomTypesUpsertArr]);
                }
            }
        } catch (err) {
            console.log(err);
            // throw new Error(err);
        }
    },
};
