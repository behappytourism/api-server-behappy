const crypto = require("crypto");
const axios = require("axios");

const { sendErrorResponse } = require("../../../helpers");
const {
    HotelBoardType,
    HotelAmenity,
    AccommodationType,
    HotelBedAllRoomType,
    HotelBedRoomType,
    HotelAmenityGroup,
    HotelChain,
    HotelHbRateComment,
    Hotel,
    RoomType,
} = require("../../../models/hotel");
const { Country } = require("../../../models");
const { State, City, Area } = require("../../../models/global");
const { saveSingleHotel } = require("../../helpers/hotel/hotelBedsHelpers");
const logger = require("../../../logger");

const publicKey = process.env.HOTEL_BEDS_API_KEY;
const privateKey = process.env.HOTEL_BEDS_SECRET;

module.exports = {
    loadBoardTypes: async (req, res) => {
        try {
            const utcDate = Math.floor(new Date().getTime() / 1000);
            const signature = publicKey + privateKey + utcDate;
            const signatureHash = crypto.createHash("sha256").update(signature).digest("hex");

            const headers = {
                "Api-key": publicKey,
                "X-Signature": signatureHash,
            };

            const params = {
                from: 1,
                to: 100,
            };
            const response = await axios.get(
                `${process.env.HOTEL_BEDS_URL}/hotel-content-api/1.0/types/boards?fields=all&language=ENG&from=${params.from}&to=${params.to}&useSecondaryLanguage=True`,
                { headers: headers }
            );

            const upsertArr = [];
            for (let j = 0; j < response?.data?.boards?.length; j++) {
                const board = response?.data?.boards[j];
                console.log("Loading ", j + " " + board?.description?.content);
                upsertArr.push({
                    updateOne: {
                        filter: { boardShortName: board?.code },
                        update: {
                            boardShortName: board?.code,
                            boardName: board?.description?.content?.toLowerCase(),
                        },
                        upsert: true,
                    },
                });
            }

            // updating database
            await HotelBoardType.bulkWrite([...upsertArr]);

            res.status(200).json({ message: "board type successfully loaded" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    loadHotelAmenities: async (req, res) => {
        try {
            const utcDate = Math.floor(new Date().getTime() / 1000);
            const signature = publicKey + privateKey + utcDate;
            const signatureHash = crypto.createHash("sha256").update(signature).digest("hex");

            const headers = {
                "Api-key": publicKey,
                "X-Signature": signatureHash,
            };

            const params = {
                from: 1,
                to: 1000,
            };
            const response = await axios.get(
                `${process.env.HOTEL_BEDS_URL}/hotel-content-api/1.0/types/facilitygroups?fields=all&language=ENG&from=${params.from}&to=${params.to}&useSecondaryLanguage=True`,
                { headers: headers }
            );

            const parentUpsertArr = [];
            for (let j = 0; j < response?.data?.facilityGroups?.length; j++) {
                const facility = response?.data?.facilityGroups[j];
                parentUpsertArr.push({
                    updateOne: {
                        filter: { hbId: facility?.code },
                        update: {
                            hbId: facility?.code,
                            name: facility?.description?.content,
                        },
                        upsert: true,
                    },
                });
            }
            await HotelAmenityGroup.bulkWrite([...parentUpsertArr]);

            let iterationCount = 1;
            const childUpsertArr = [];
            for (let i = 0; i < iterationCount; i++) {
                const params = {
                    from: i * 1000 + 1,
                    to: (i + 1) * 1000,
                };
                const response = await axios.get(
                    `${process.env.HOTEL_BEDS_URL}/hotel-content-api/1.0/types/facilities?fields=all&language=ENG&from=${params.from}&to=${params.to}&useSecondaryLanguage=True`,
                    { headers: headers }
                );

                iterationCount = Math.ceil(response.data.total / 100);

                // check this working or not
                const amenitiesWithHbId = {};
                const amenities = await HotelAmenityGroup.find({});
                amenities.forEach((item) => {
                    amenitiesWithHbId[item?.hbId] = item;
                });

                for (let j = 0; j < response?.data?.facilities?.length; j++) {
                    const facility = response?.data?.facilities[j];
                    if (amenitiesWithHbId[facility?.facilityGroupCode]) {
                        childUpsertArr.push({
                            updateOne: {
                                filter: {
                                    hbId: facility?.code,
                                },
                                update: {
                                    hbId: facility?.code,
                                    name: facility?.description?.content,
                                    parentAmenity:
                                        amenitiesWithHbId[facility?.facilityGroupCode]?._id,
                                },
                                upsert: true,
                            },
                        });
                    }
                }
            }
            await HotelAmenity.bulkWrite([...childUpsertArr]);

            res.status(200).json({ message: "hotel amenities successfully loaded" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    loadAccommodationTypes: async (req, res) => {
        try {
            const utcDate = Math.floor(new Date().getTime() / 1000);
            const signature = publicKey + privateKey + utcDate;
            const signatureHash = crypto.createHash("sha256").update(signature).digest("hex");

            const headers = {
                "Api-key": publicKey,
                "X-Signature": signatureHash,
            };

            const params = {
                from: 1,
                to: 100,
            };
            const response = await axios.get(
                `${process.env.HOTEL_BEDS_URL}/hotel-content-api/1.0/types/accommodations?fields=all&language=ENG&from=${params.from}&to=${params.to}&useSecondaryLanguage=True`,
                { headers: headers }
            );

            const upsertArr = [];
            for (let j = 0; j < response?.data?.accommodations?.length; j++) {
                const accommodation = response?.data?.accommodations[j];
                console.log(`Loading ${j} ${accommodation?.typeDescription}`);
                upsertArr.push({
                    updateOne: {
                        filter: { accommodationTypeCode: accommodation?.code },
                        update: {
                            accommodationTypeCode: accommodation?.code,
                            accommodationTypeName: accommodation?.typeDescription,
                        },
                        upsert: true,
                    },
                });
            }

            // updating database
            await AccommodationType.bulkWrite([...upsertArr]);

            res.status(200).json({ message: "accommodation types successfully loaded" });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    loadRoomTypes: async (req, res) => {
        try {
            const utcDate = Math.floor(new Date().getTime() / 1000);
            const signature = publicKey + privateKey + utcDate;
            const signatureHash = crypto.createHash("sha256").update(signature).digest("hex");

            const headers = {
                "Api-key": publicKey,
                "X-Signature": signatureHash,
            };

            const upsertArr = [];
            let iterationCount = 1;
            for (let i = 0; i < iterationCount; i++) {
                const params = {
                    from: i * 1000 + 1,
                    to: (i + 1) * 1000,
                };
                const response = await axios.get(
                    `${process.env.HOTEL_BEDS_URL}/hotel-content-api/1.0/types/rooms?fields=all&language=ENG&useSecondaryLanguage=True&to=${params.to}&from=${params.from}`,
                    { headers: headers }
                );

                iterationCount = Math.ceil(response.data.total / 1000);

                for (let j = 0; j < response?.data?.rooms?.length; j++) {
                    const room = response?.data?.rooms[j];
                    upsertArr.push({
                        updateOne: {
                            filter: { hbId: room?.code },
                            update: {
                                hbId: room?.code,
                                minPax: room?.minPax,
                                maxPax: room?.maxPax,
                                maxAdults: room?.maxAdults,
                                maxChildren: room?.maxChildren,
                                minAdults: room?.minAdults,
                                roomName: room?.description,
                            },
                            upsert: true,
                        },
                    });
                }
            }

            // updating database
            await HotelBedAllRoomType.bulkWrite([...upsertArr]);

            res.status(200).json({ message: "room type successfully loaded" });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    loadHotelChains: async (req, res) => {
        try {
            const utcDate = Math.floor(new Date().getTime() / 1000);
            const signature = publicKey + privateKey + utcDate;
            const signatureHash = crypto.createHash("sha256").update(signature).digest("hex");

            const headers = {
                "Api-key": publicKey,
                "X-Signature": signatureHash,
            };

            let iterationCount = 1;
            const upsertArr = [];
            for (let i = 0; i < iterationCount; i++) {
                const params = {
                    from: i * 1000 + 1,
                    to: (i + 1) * 1000,
                };
                const response = await axios.get(
                    `${process.env.HOTEL_BEDS_URL}/hotel-content-api/1.0/types/chains?fields=all&language=ENG&from=${params.from}&to=${params.to}&useSecondaryLanguage=True`,
                    { headers: headers }
                );

                iterationCount = Math.ceil(response.data.total / 1000);

                for (let j = 0; j < response?.data?.chains?.length; j++) {
                    const chain = response?.data?.chains[j];
                    console.log("Loading ", chain?.description?.content?.toLowerCase());
                    upsertArr.push({
                        updateOne: {
                            filter: { chainCode: chain?.code },
                            update: {
                                chainCode: chain?.code,
                                chainName: chain?.description?.content?.toLowerCase(),
                            },
                            upsert: true,
                        },
                    });
                }
            }

            // updating database
            await HotelChain.bulkWrite([...upsertArr]);

            res.status(200).json({ message: "hotel chain successfully loaded" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    loadHotelRateComments: async (req, res) => {
        try {
            const utcDate = Math.floor(new Date().getTime() / 1000);
            const signature = publicKey + privateKey + utcDate;
            const signatureHash = crypto.createHash("sha256").update(signature).digest("hex");

            const headers = {
                "Api-key": publicKey,
                "X-Signature": signatureHash,
            };

            let iterationCount = 1;
            const upsertArr = [];
            for (let i = 0; i < iterationCount; i++) {
                const params = {
                    from: i * 1000 + 1,
                    to: (i + 1) * 1000,
                };
                const response = await axios.get(
                    `${process.env.HOTEL_BEDS_URL}/hotel-content-api/1.0/types/ratecomments?fields=all&language=ENG&from=${params.from}&to=${params.to}&useSecondaryLanguage=True`,
                    { headers: headers }
                );

                iterationCount = Math.ceil(response.data.total / 1000);

                for (let j = 0; j < response?.data?.rateComments?.length; j++) {
                    const rate = response?.data?.rateComments[j];
                    console.log("Loading ", rate?.code);
                    upsertArr.push({
                        updateOne: {
                            filter: { code: rate?.code, hotel: rate?.hotel },
                            update: {
                                code: rate?.code,
                                hotel: rate?.hotel,
                                incoming: rate?.incoming,
                                commentsByRates: rate?.commentsByRates,
                            },
                            upsert: true,
                        },
                    });
                }
            }

            // updating database
            await HotelHbRateComment.bulkWrite([...upsertArr]);

            res.status(200).json({ message: "hotel bed rate comments successfully loaded" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    loadHotels: async (req, res) => {
        try {
            const accommodationTypesWithKey = {};
            const accommodationTypes = await AccommodationType.find({});
            accommodationTypes.forEach((item) => {
                accommodationTypesWithKey[item?.accommodationTypeCode] = item;
            });

            const hotelChainsWithKey = {};
            const hotelChains = await HotelChain.find({ isActive: true });
            hotelChains.forEach((item) => {
                hotelChainsWithKey[item?.chainCode] = item;
            });

            const countriesWithKey = {};
            const countries = await Country.find({ isDeleted: false });
            countries?.forEach((item) => {
                countriesWithKey[item?.isocode] = item;
            });

            const statesWithKey = {};
            const states = await State.find({ isDeleted: false });
            states?.forEach((item) => {
                statesWithKey[`${item?.country}${item?.stateCode}`] = item;
            });

            const citiesWithKey = {};
            const cities = await City.find({ isDeleted: false });
            cities?.forEach((item) => {
                citiesWithKey[`${item?.country}${item?.cityCode}`] = item;
            });

            const boardsWithKey = {};
            const boards = await HotelBoardType.find({});
            boards.forEach((item) => {
                boardsWithKey[item?.boardShortName] = item;
            });

            const roomTypesWithKey = {};
            const roomTypes = await HotelBedAllRoomType.find({});
            roomTypes.forEach((item) => {
                roomTypesWithKey[item?.hbId] = item;
            });

            const amenitiesWithKey = {};
            const amenities = await HotelAmenity.find({ isLoaded: true, isParent: false });
            amenities.forEach((item) => {
                amenitiesWithKey[item?.hbId] = item;
            });

            // const countryCodes = ["SA", "KW", "QA", "BH", "OM"];
            // const countryCodes = [
            //     "CN",
            //     "IN",
            //     "KR",
            //     "AF",
            //     "JP",
            //     "AM",
            //     "AZ",
            //     "BD",
            //     "BT",
            //     "BN",
            //     "KH",
            //     "GE",
            //     "HK",
            //     "IN",
            //     "ID",
            //     "IQ",
            //     "IL",
            //     "JO",
            //     "KZ",
            //     "KG",
            //     "LA",
            //     "LB",
            //     "MO",
            //     "MY",
            //     "MV",
            //     "MN",
            //     "MM",
            //     "NP",
            // ];

            const countryCodes = ["IT"];
            // const countryCodes = countries?.map((country) => country.isocode);

            for (let h = 0; h < countryCodes?.length; h++) {
                const countryCode = countryCodes[h];
                if (countryCode === "AE") {
                    continue;
                }
                logger.info("IMPORTING " + countryCode);

                const roomTypeUpsertArr = [];
                let upsertArr = [];
                let iterationCount = 1;
                for (let i = 0; i < iterationCount; i++) {
                    logger.info(`I is ${i}`);
                    const utcDate = Math.floor(new Date().getTime() / 1000);
                    const signature = publicKey + privateKey + utcDate;
                    const signatureHash = crypto
                        .createHash("sha256")
                        .update(signature)
                        .digest("hex");

                    const headers = {
                        "Api-key": publicKey,
                        "X-Signature": signatureHash,
                    };
                    let limit = 1000;
                    const params = {
                        countryCode,
                        from: i * limit + 1,
                        to: (i + 1) * limit,
                    };
                    const response = await axios.get(
                        `${process.env.HOTEL_BEDS_URL}/hotel-content-api/1.0/hotels?fields=all&language=ENG&useSecondaryLanguage=false&countryCode=${params.countryCode}&to=${params.to}&from=${params.from}`,
                        { headers: headers }
                    );
                    iterationCount = Math.ceil(response.data.total / limit);
                    logger.info(`Total ${countryCode} hotels are ${iterationCount}`);

                    for (let j = 0; j < response?.data?.hotels?.length; j++) {
                        const promiseReq = saveSingleHotel({
                            hotel: response?.data?.hotels[j],
                            countriesWithKey,
                            statesWithKey,
                            boardsWithKey,
                            accommodationTypesWithKey,
                            roomTypesWithKey,
                            amenitiesWithKey,
                            roomTypeUpsertArr,
                            citiesWithKey,
                            hotelChainsWithKey,
                        });
                        upsertArr.push(promiseReq);
                    }

                    await Promise.all([...upsertArr]);
                    logger.info(`Saved ${upsertArr?.length} ${countryCode} hotels`);
                    upsertArr = [];
                }
            }

            res.status(200).json({ message: "hotels successfully loaded" });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    addAllHotelBedRoomTypeToMain: async (req, res) => {
        try {
            const hotels = await Hotel.find({ hotelLoadedFrom: "hotel-bed" }).lean();

            const addRoomTypesToMain = async (hotel) => {
                const hbRoomTypes = await HotelBedRoomType.find({
                    hotel: hotel?._id,
                }).lean();

                for (let j = 0; j < hbRoomTypes.length; j++) {
                    const hbRoomType = hbRoomTypes[j];

                    const newRoomType = new RoomType({
                        hotel: hotel?._id,
                        roomName: hbRoomType?.roomName,
                        serviceBy: "NIGHT",
                        roomOccupancies: [],
                        infantAgeFrom: 0,
                        infantAgeTo: 5.99,
                        childAgeFrom: 6,
                        childAgeTo: 11.99,
                        adultAgeFrom: 12,
                        adultAgeTo: 999,
                        amenities: hbRoomType?.amenities || [],
                        images: hbRoomType.images || [],
                        hotelBedRooms: [hbRoomType?.hbId],
                        isActive: true,
                        hotelLoadedFrom: "hotel-bed",
                    });
                    await newRoomType.save();
                }
            };

            let promises = [];
            for (let i = 0; i < hotels?.length; i++) {
                let hotel = hotels[i];

                promises.push(addRoomTypesToMain(hotel));
            }

            await Promise.all(promises);

            res.status(200).json({
                message: "hotel bed room types successfully added to main room types",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteAllRoomTypesLoadedFromHb: async (req, res) => {
        try {
            const response = await RoomType.deleteMany({
                hotelLoadedFrom: "hotel-bed",
            });

            res.status(200).json({
                response,
                message: "hotel bed room types successfully deleted from main room types",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    loadCountriesAndStates: async (req, res) => {
        try {
            const utcDate = Math.floor(new Date().getTime() / 1000);
            const signature = publicKey + privateKey + utcDate;
            const signatureHash = crypto.createHash("sha256").update(signature).digest("hex");

            const headers = {
                "Api-key": publicKey,
                "X-Signature": signatureHash,
            };

            let iterationCount = 1;
            for (let i = 0; i < iterationCount; i++) {
                const params = {
                    from: i * 1000 + 1,
                    to: (i + 1) * 1000,
                };
                const response = await axios.get(
                    `${process.env.HOTEL_BEDS_URL}/hotel-content-api/1.0/locations/countries?fields=all&language=ENG&from=${params.from}&to=${params.to}`,
                    { headers: headers }
                );

                iterationCount = Math.ceil(response.data.total / 1000);

                for (let j = 0; j < response?.data?.countries?.length; j++) {
                    const country = response?.data?.countries[j];
                    if (country?.isoCode === "AE") {
                        continue;
                    }
                    console.log("Loading ", country?.isoCode);

                    const dbCountry = await Country.findOneAndUpdate(
                        { isocode: country?.isoCode },
                        {
                            countryName: country?.description?.content,
                            flag: `https://cdn.jsdelivr.net/npm/svg-country-flags@1.2.10/svg/${country?.isoCode?.toLowerCase()}.svg`,
                            isDeleted: false,
                            isocode: country?.isoCode,
                        },
                        { upsert: true }
                    );

                    const upsertArr = [];
                    for (let k = 0; k < country?.states?.length; k++) {
                        const state = country?.states[k];

                        upsertArr.push({
                            updateOne: {
                                filter: {
                                    stateCode: state?.code,
                                    country: dbCountry?._id,
                                },
                                update: {
                                    stateCode: state?.code,
                                    stateName: state?.name,
                                    country: dbCountry?._id,
                                },
                                upsert: true,
                            },
                        });
                    }

                    await State.bulkWrite([...upsertArr]);
                }
            }

            res.status(200).json({ message: "countries and states successfully loaded" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    loadCitiesAndAreas: async (req, res) => {
        try {
            const utcDate = Math.floor(new Date().getTime() / 1000);
            const signature = publicKey + privateKey + utcDate;
            const signatureHash = crypto.createHash("sha256").update(signature).digest("hex");

            const headers = {
                "Api-key": publicKey,
                "X-Signature": signatureHash,
            };

            const allPromises = [];
            let iterationCount = 1;
            for (let i = 0; i < iterationCount; i++) {
                const params = {
                    from: i * 1000 + 1,
                    to: (i + 1) * 1000,
                };
                const response = await axios.get(
                    `${process.env.HOTEL_BEDS_URL}/hotel-content-api/1.0/locations/destinations?fields=all&language=ENG&from=${params.from}&to=${params.to}&useSecondaryLanguage=false`,
                    { headers: headers }
                );

                iterationCount = Math.ceil(response.data.total / 1000);

                allPromises.push(
                    (async () => {
                        const allCitiesByCountryCode = {};

                        for (let j = 0; j < response?.data?.destinations?.length; j++) {
                            const destination = response?.data?.destinations[j];

                            if (allCitiesByCountryCode[destination?.countryCode]) {
                                allCitiesByCountryCode[destination?.countryCode]?.push({
                                    cityCode: destination?.code,
                                    cityName: destination?.name?.content,
                                    areas: destination?.zones,
                                });
                            } else {
                                allCitiesByCountryCode[destination?.countryCode] = [
                                    {
                                        cityCode: destination?.code,
                                        cityName: destination?.name?.content,
                                        areas: destination?.zones,
                                    },
                                ];
                            }
                        }

                        const areasUpsertArr = [];

                        for (let j = 0; j < Object.keys(allCitiesByCountryCode)?.length; j++) {
                            const countryCode = Object.keys(allCitiesByCountryCode)[j];

                            if (countryCode === "AE") {
                                continue;
                            }
                            if (countryCode === "FR" || countryCode === "IN") {
                                console.log("Uploading ", countryCode);
                            }
                            const dbCountry = await Country.findOne({
                                isocode: countryCode,
                            }).lean();
                            const citiesData = allCitiesByCountryCode[countryCode];
                            if (dbCountry) {
                                for (let k = 0; k < citiesData?.length; k++) {
                                    const city = citiesData[k];
                                    console.log("Upading city ", city?.cityName);
                                    const updatedCity = await City.findOneAndUpdate(
                                        { cityCode: city?.cityCode, country: dbCountry?._id },
                                        {
                                            cityCode: city?.cityCode,
                                            cityName: city?.cityName,
                                            country: dbCountry?._id,
                                        },
                                        { upsert: true }
                                    );

                                    for (let l = 0; l < city?.areas?.length; l++) {
                                        const area = city?.areas[l];
                                        console.log(area?.zoneCode, area?.name);
                                        areasUpsertArr.push({
                                            updateOne: {
                                                filter: {
                                                    areaCode: area?.zoneCode?.toString(),
                                                    city: updatedCity?._id,
                                                    country: dbCountry?._id,
                                                },
                                                update: {
                                                    areaCode: area?.zoneCode?.toString(),
                                                    areaName: area?.name,
                                                    country: dbCountry?._id,
                                                    city: updatedCity?._id,
                                                },
                                                upsert: true,
                                            },
                                        });
                                    }
                                }
                            } else {
                                logger.error(`country ${countryCode} not found!`);
                            }
                        }

                        await Area.bulkWrite([...areasUpsertArr]);
                        console.log("added " + areasUpsertArr?.length + " area");
                    })()
                );
            }

            await Promise.all([...allPromises]);

            res.status(200).json({ message: "cities and areas successfully loaded" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
