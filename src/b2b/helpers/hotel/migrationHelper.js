const { default: axios } = require("axios");
const { Hotel, RoomType, HotelBedRoomType } = require("../../../models/hotel");
const VervotechMigrationProcess = require("../../models/hotel/vervotechMigrationProcess.model");
const VervotechSorted = require("../../models/hotel/vervotechSort.model");
const OttilaIdImport = require("../../models/hotel/ottilaIdImport.model");
const B2BHotelProvider = require("../../models/hotel/b2bHotelProviders.model");
const { isValidObjectId } = require("mongoose");
const MarkupProfile = require("../../../admin/models/markupProfile.model");
const OttilaRoomType = require("../../../models/hotel/ottilaRoomType.model");
const fs = require("fs"); // Import the file system module
const { B2BMarkupProfile } = require("../../models");
const { MarketStrategy } = require("../../../admin/models");
const { addIdsToJsonFile } = require("../../utils/file");

// const ottilaIdsData = require("./hotelWithOttilaIds.json");

const getVervotedProviderIds = async (resumeKey) => {
    const headers = {
        accountId: "travellerschoice",
        apikey: "b1d61509-73bb-4744-a22b-014e20a835ff",
        syncId: 323,
    };

    const PROVIDER_FAMILY = "HotelBeds";

    const params = {
        limit: 1000,
        providerFamily: PROVIDER_FAMILY,
        lastUpdateDateTime: "2020-08-21T13:50:55Z",
    };

    let URL =
        "https://hotelmapping.vervotech.com" +
        "/api/3.0/mappings" +
        `?limit=${params.limit}&providerFamily${params.providerFamily}&lastUpdateDateTime=${params.lastUpdateDateTime}`;

    if (resumeKey) {
        URL = URL + `&resumeKey=${resumeKey}`;
    }

    try {
        const response = await axios.get(URL, {
            headers,
        });

        if (response && response.data && response.data.Mappings) {
            const resumeKey = response.data?.ResumeKey;
            const mappings = response.data.Mappings;
            return { mappings, resumeKey, providerFamily: PROVIDER_FAMILY };
        }
    } catch (err) {
        console.error(err);
    }
};

const getVervotechIdsDBSave = async (No, incomingResKey) => {
    let Mappings = [];
    let ResumeKey = incomingResKey;
    let ProviderFamily;
    for (let index = 1; index <= 50; index++) {
        console.log("CALL " + index);

        const { mappings, resumeKey, providerFamily } = await getVervotedProviderIds(ResumeKey);

        Mappings = [...Mappings, ...mappings];
        ResumeKey = resumeKey;
        ProviderFamily = providerFamily;

        if (!ResumeKey) {
            ResumeKey = "completed!";
            break;
        }

        await new Promise((resolve) => setTimeout(resolve, 5000)); // sleep 2 sec
    }

    await VervotechSorted.create({
        No,
        Mappings,
        ResumeKey,
        ProviderFamily,
        Imported: false,
    });
    console.log("COMPLETED");
};

const getVervotechMatchedHotelMappingV2 = async (No, id) => {
    try {
        const response = await VervotechSorted.findOne({ _id: id });

        const mappings = response.Mappings;
        const resumeKey = response.ResumeKey;
        const providerFamily = response.ProviderFamily;

        console.log(`[VERVOTECH MIGRATION] - [FETCH MAPPINGS COMPLETED]`);

        if (mappings && mappings.length && resumeKey && providerFamily) {
            console.log(
                `[VERVOTECH MIGRATION] - [FETCH MAPPINGS COMPLETED] : LENGTH = ${mappings.length}`
            );
            try {
                const { mappingsUpdated } = await startMigrationProcess(
                    mappings,
                    providerFamily,
                    resumeKey,
                    No
                );

                await VervotechSorted.updateOne(
                    { _id: id },
                    { $set: { Imported: true, Mappings: mappingsUpdated } }
                );
                console.log(
                    `********************************************************************************************************`
                );

                return;
            } catch (error) {
                console.log(
                    `[VERVOTECH MIGRATION] - [FETCH MAPPINGS ERROR] : ERROR = ${error?.message}`
                );

                console.error(error);
            }
        } else {
            console.log(
                `[VERVOTECH MIGRATION] - [FETCH MAPPINGS] : RESPONSE NOT FOUND = ${response}`
            );
        }
    } catch (error) {
        console.log(`[VERVOTECH MIGRATION] - [FETCH MAPPINGS ERROR] : ERROR = ${error?.message}`);

        console.error(error);
    }
};

const getVervotechMatchedHotelMapping = async (resumeKey, processId) => {
    const headers = {
        accountId: "travellerschoice",
        apikey: "b1d61509-73bb-4744-a22b-014e20a835ff",
        syncId: 323,
    };

    const PROVIDER_FAMILY = "HotelBeds";

    const params = {
        limit: 1000,
        providerFamily: PROVIDER_FAMILY,
        lastUpdateDateTime: "2020-08-21T13:50:55Z",
    };

    let URL =
        "https://hotelmapping.vervotech.com" +
        "/api/3.0/mappings" +
        `?limit=${params.limit}&providerFamily${params.providerFamily}&lastUpdateDateTime=${params.lastUpdateDateTime}`;

    if (resumeKey) {
        URL = URL + `&resumeKey=${resumeKey}`;
    }

    try {
        const response = await axios.get(URL, {
            headers,
        });

        console.log(`[VERVOTECH MIGRATION] - [FETCH MAPPINGS COMPLETED]`);

        if (response && response.data && response.data.ResumeKey && response.data.Mappings) {
            console.log(
                `[VERVOTECH MIGRATION] - [FETCH MAPPINGS COMPLETED] : LENGTH = ${response.data.Mappings.length}`
            );
            try {
                const resumeKey = response.data.ResumeKey;
                const mappings = response.data.Mappings;

                let newProcessId = processId;

                if (!newProcessId) {
                    const process = await VervotechMigrationProcess.create({
                        resumeKey,
                    });

                    newProcessId = process._id;

                    process.save();

                    console.log(
                        `[VERVOTECH MIGRATION] - [FETCH MAPPINGS] : PROCESS DOC ADDED PROCESSID = ${newProcessId} RESUME_KEY = ${resumeKey}`
                    );
                } else {
                    await VervotechMigrationProcess.updateOne(
                        { _id: newProcessId },
                        { $set: { resumeKey } }
                    );

                    console.log(
                        `[VERVOTECH MIGRATION] - [FETCH MAPPINGS] : PROCESS DOC UPDATED PROCESSID = ${newProcessId} RESUME_KEY = ${resumeKey}`
                    );
                }

                await startMigrationProcess(mappings, PROVIDER_FAMILY, newProcessId);

                if (resumeKey && resumeKey !== "") {
                    async function delayedCall() {
                        await new Promise((resolve) => setTimeout(resolve, 5000));

                        await getVervotechMatchedHotelMapping(resumeKey, newProcessId);
                    }

                    delayedCall();
                } else {
                    console.log(
                        `[VERVOTECH MIGRATION] - [*****************RESPONSE COMPLETED****************]`
                    );
                }
            } catch (error) {
                console.log(
                    `[VERVOTECH MIGRATION] - [FETCH MAPPINGS ERROR] : ERROR = ${error?.message}`
                );

                console.error(error);
            }
        } else {
            console.log(
                `[VERVOTECH MIGRATION] - [FETCH MAPPINGS] : RESPONSE NOT FOUND = ${response}`
            );
        }
    } catch (error) {
        console.log(`[VERVOTECH MIGRATION] - [FETCH MAPPINGS ERROR] : ERROR = ${error?.message}`);

        console.error(error);
    }
};

const getProviderContentByProviderHotelIds = async (payload) => {
    const headers = {
        accountId: "travellerschoice",
        apikey: "b1d61509-73bb-4744-a22b-014e20a835ff",
    };

    let URL =
        "https://hotelmapping.vervotech.com/api/3.0/content/GetProviderContentByProviderHotelIds";

    const body = {
        ProviderHotelIdentifiers: payload,
    };

    try {
        const response = await axios.post(URL, body, {
            headers,
        });

        if (response && response.data && response.data.Hotels && response.data.Hotels.length) {
            const Hotels = response.data?.Hotels;
            return { Hotels };
        } else {
            console.log("[getProviderContentByProviderHotelIds] HOTELS NOT FOUND");
            console.log(response.data);
        }
    } catch (err) {
        console.error(err);
    }
};

const startMigrationForPendingHbIds = async (No) => {
    try {
        const registeredHotels = await Hotel.find({
            vervotechId: { $exists: false },
            hbId: { $exists: true, $ne: null },
        })
            .select("_id hbId vervotechId")
            .sort({ hbId: 1 });

        let count = 1;
        const batchSize = 100;
        const delay = 5000; // 5 seconds in milliseconds
        const vervotechHotels = [];

        for (let i = 0; i < registeredHotels.length; i += batchSize) {
            const batch = registeredHotels.slice(i, i + batchSize);
            const payload = batch.map((hotel) => ({
                ProviderHotelId: hotel.hbId,
                ProviderFamily: "HotelBeds",
            }));

            console.log("CALL ", count);
            const { Hotels } = await getProviderContentByProviderHotelIds(payload);
            count++;

            Hotels[0].ProviderHotels.forEach((providerHotel) => {
                vervotechHotels.push({
                    ProviderHotelId: providerHotel.ProviderHotelId,
                    VervotechId: providerHotel.VervotechId,
                    ProviderName: "HotelBeds",
                });
            });

            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        if (vervotechHotels && vervotechHotels.length) {
            await VervotechSorted.create({
                No,
                Mappings: vervotechHotels,
                ResumeKey: "for_pending_hbIds",
                ProviderFamily: "HotelBeds",
                Imported: false,
            });
            console.log("COMPLETED");
        } else {
            console.log(`[startMigrationForPendingHbIds] - vervotechHotels not found`);
        }
    } catch (error) {
        console.log(`[startMigrationForPendingHbIds] - HOTELS FETCHING ERROR`);
        console.error(error);
    }
};

async function startMigrationProcess(mappings, PROVIDER_FAMILY, resumeKey, No) {
    console.log(`[VERVOTECH MIGRATION] - [*********************STARTED*********************]`);

    const PROVIDER = {
        HotelBeds: "hbId",
        Ottila: "ottilaId",
        Contarct: "contractId",
    };

    const mismathedProviders = [];
    const unmatchedProviders = [];

    const registeredHotels = await Hotel.find({
        vervotechId: { $exists: false },
        hbId: { $exists: true, $ne: null },
    })
        .select("_id hbId vervotechId")
        .sort({ hbId: 1 });

    console.time("Time taken for parse & sort");
    mappings.forEach((obj) => {
        obj.ProviderHotelId = parseInt(obj?.ProviderHotelId);
    });
    mappings.sort((a, b) => a?.ProviderHotelId - b?.ProviderHotelId);
    console.timeEnd("Time taken for parse & sort");

    let matchedIndex = 0;
    let greaterProviderId = registeredHotels[registeredHotels.length - 1].hbId;

    console.time("Time taken for mapping");
    for (const vervoHotel of mappings) {
        if (vervoHotel?.ProviderName && vervoHotel?.ProviderHotelId && vervoHotel?.VervotechId) {
            if (vervoHotel.ProviderName === PROVIDER_FAMILY) {
                let matched = false;
                if (greaterProviderId !== 0 && greaterProviderId < vervoHotel?.ProviderHotelId) {
                    if (!matched) {
                        console.log(
                            `[VERVOTECH MIGRATION] - [REGISTERED HOTELS] : UNMATCHED PROVIDERID = ${vervoHotel.ProviderHotelId}`
                        );
                        unmatchedProviders.push(vervoHotel);
                    }
                    continue;
                }
                for (let i = matchedIndex; i < registeredHotels.length; i++) {
                    const regHotel = registeredHotels[i];
                    console.log(
                        `Provider: ${PROVIDER_FAMILY}, ProviderId Vervo: ${
                            vervoHotel?.ProviderHotelId
                        } ProviderId Reg: ${
                            regHotel[PROVIDER[PROVIDER_FAMILY]]
                        } CurrentIndex: ${i} matchedIndex: ${matchedIndex} Greatest ProviderId Reg: ${greaterProviderId}`
                    );
                    if (i === registeredHotels.length - 1) {
                        greaterProviderId = regHotel[PROVIDER[PROVIDER_FAMILY]];
                    }
                    if (regHotel?.vervotechId && regHotel.vervotechId === vervoHotel.VervotechId) {
                        matched = true;
                        console.log(
                            `[VERVOTECH MIGRATION] - [REGISTERED HOTELS] : VERVOTECHID ALREADY EXISTS ID = ${regHotel.vervotechId}, HOTELID = ${regHotel._id}`
                        );
                        matchedIndex = i + 1;
                        break;
                    } else {
                        if (regHotel[PROVIDER[PROVIDER_FAMILY]] === vervoHotel.ProviderHotelId) {
                            try {
                                await Hotel.updateOne(
                                    { _id: regHotel._id },
                                    {
                                        $set: {
                                            vervotechId: vervoHotel.VervotechId,
                                            vervotechIdAdded: true,
                                        },
                                    }
                                );
                                matched = true;
                                console.log(
                                    `[VERVOTECH MIGRATION] - [REGISTERED HOTELS] : VERVOTECHID ADDED HOTELID = ${regHotel._id}`
                                );
                                matchedIndex = i + 1;
                                break;
                            } catch (error) {
                                console.log(
                                    `[VERVOTECH MIGRATION] - [REGISTERED HOTELS] : ERRROR = ${error}`
                                );
                            }
                        } else if (
                            regHotel[PROVIDER[PROVIDER_FAMILY]] > vervoHotel.ProviderHotelId
                        ) {
                            matchedIndex = i;
                            break;
                        }
                    }
                }
                if (!matched) {
                    console.log(
                        `[VERVOTECH MIGRATION] - [REGISTERED HOTELS] : UNMATCHED PROVIDERID = ${vervoHotel.ProviderHotelId}`
                    );
                    unmatchedProviders.push(vervoHotel);
                }
            } else {
                console.log(
                    `[VERVOTECH MIGRATION] - [MAPPINGS] : MISMATHED PROVIDER = ${vervoHotel.ProviderName}`
                );
                mismathedProviders.push(vervoHotel);
            }
        } else {
            console.log(
                `[VERVOTECH MIGRATION] - [MAPPINGS] : MISSING FIELDS = ProviderName:${vervoHotel?.ProviderName}, ProviderHotelId:${vervoHotel?.ProviderHotelId}, VervotechId:${vervoHotel?.VervotechId}`
            );
        }
        vervoHotel.completed = true;
    }
    console.timeEnd("Time taken for mapping");

    try {
        await VervotechMigrationProcess.create({
            resumeKey,
            No,
            mismathedProviders,
            unmatchedProviders,
        });

        console.log(`[VERVOTECH MIGRATION] - [MAPPINGS] :  PROCESS DOC UPDATED`);
    } catch (error) {
        console.log(`[VERVOTECH MIGRATION] - [MAPPINGS] :  PROCESS DOC UPDATE ERROR ${error}`);
    }

    console.log(`[VERVOTECH MIGRATION] - [*********************COMPLETED*********************]`);
    return { mappingsUpdated: mappings };
}

const importOttillaIdsFromVervotech = async () => {
    const registeredHotels = await Hotel.find({
        vervotechId: { $exists: true, $ne: null },
    })
        .select("_id ottilaId vervotechId")
        .sort({ vervotechId: 1 });

    const ottillaNotAddedHotels = [];

    if (registeredHotels && registeredHotels.length) {
        console.log(`[OTTILA ID IMPORT] - [REGISTERED HOTELS] COUNT: ${registeredHotels.length}`);

        console.time("Time taken for importing Ottila Ids");
        for (let i = 0; i < registeredHotels.length; i++) {
            // async function callWithDelay() {
            //     await new Promise(resolve => setTimeout(resolve, 5000));
            //     functionCall();
            //   }

            //     if (i % 10 === 0 && i > 0) {
            //       await callWithDelay();
            //     } else {
            //       functionCall();
            //     }

            let matched = false;
            const regHotel = registeredHotels[i];
            if (regHotel.vervotechId) {
                try {
                    const { VervotechId, ProviderHotels } = await getProvidersMappingByVervotechId(
                        regHotel.vervotechId
                    );

                    const Provider = "Ottila";

                    console.log(
                        `[OTTILA ID IMPORT] - PROVIDER: ${Provider} REG HOTEL: ${regHotel.vervotechId._id} VERVOTECHID REG: ${regHotel.vervotechId} VERVOTECHID INCOMING: ${VervotechId}`
                    );

                    if (regHotel.vervotechId === VervotechId) {
                        const OttilaProviderDetails = ProviderHotels.find(
                            (providerDetails) => providerDetails.ProviderFamily === Provider
                        );

                        if (OttilaProviderDetails && OttilaProviderDetails.ProviderHotelId) {
                            if (
                                regHotel.ottilaId &&
                                regHotel.ottilaId === OttilaProviderDetails.ProviderHotelId
                            ) {
                                matched = true;
                                console.log(
                                    `[OTTILA ID IMPORT] - [REGISTERED HOTEL] : OTTILA ID ALREADY EXISTS HOTELID = ${regHotel._id}`
                                );
                            }
                            try {
                                await Hotel.updateOne(
                                    { _id: regHotel._id },
                                    {
                                        $set: {
                                            ottilaId: OttilaProviderDetails.ProviderHotelId,
                                            ottilaIdAdded: true,
                                        },
                                    }
                                );
                                matched = true;
                                console.log(
                                    `[OTTILA ID IMPORT] - [REGISTERED HOTEL] : OTTILA ID ADDED HOTELID = ${regHotel._id}`
                                );
                            } catch (error) {
                                console.log(
                                    `OTTILA ID IMPORT] - [REGISTERED HOTEL] OTTILLA ID DB UPDATE : ERRROR = ${error}`
                                );
                            }
                        } else {
                            console.log(
                                `[OTTILA ID IMPORT] - [REGISTERED HOTEL] [OttilaProviderDetails NOT FOUND] EXSITING: ${ProviderHotels}`
                            );
                        }
                    } else {
                        console.log(
                            `[OTTILA ID IMPORT] - [REGISTERED HOTEL] VERVOTECH ID MISMATCHED = INCOMING: ${VervotechId} REG: ${regHotel.vervotechId}`
                        );
                    }
                } catch (error) {
                    console.log(
                        `[OTTILA ID IMPORT] - [getProvidersMappingByVervotechId CALL ERROR] - REG HOTEL: ${regHotel.vervotechId._id} VERVOTECHID REG: ${regHotel.vervotechId}`
                    );
                }
            } else {
                console.log(
                    `[OTTILA ID IMPORT] - [REGISTERED HOTEL] VERVOTECH ID NOT FOUND FOR REG HOTEL: ${regHotel._id}`
                );
            }

            if (!matched) {
                console.log(
                    `[OTTILA ID IMPORT] - [REGISTERED HOTEL] UNMATCHED HOTEL: ${regHotel._id}`
                );
                ottillaNotAddedHotels.push(regHotel);
            }
        }

        console.timeEnd("Time taken for importing Ottila Ids");

        if (ottillaNotAddedHotels && ottillaNotAddedHotels.length) {
            try {
                await OttilaIdImport.create({
                    ottillaNotAddedHotels,
                    completed: false,
                });

                console.log(`[OTTILA ID IMPORT] - [REGISTERED HOTEL] OTTILA IMPORT DOC ADDED`);
            } catch (error) {
                console.log(
                    `[OTTILA ID IMPORT] - [REGISTERED HOTEL] OTTILA IMPORT DOC ADD ERROR ${error}`
                );
            }
        }

        console.log(`[OTTILA ID IMPORT] - [*********************COMPLETED*********************]`);
    } else {
        console.log(`[OTTILA ID IMPORT] - [REGISTERED HOTELS] NOT FOUND`);
    }
};

const getProvidersMappingByVervotechId = async (vervotechId) => {
    const headers = {
        accountId: "travellerschoice",
        apikey: "b1d61509-73bb-4744-a22b-014e20a835ff",
    };

    let URL =
        "https://hotelmapping.vervotech.com" +
        "/api/3.0/mappings/GetProviderHotelMappingsByVervotechId" +
        `?vervotechId=${vervotechId}`;

    try {
        const response = await axios.get(URL, {
            headers,
        });

        if (
            response &&
            response.data &&
            response.data.VervotechId &&
            response.data.ProviderHotels &&
            response.data.ProviderHotels.length
        ) {
            return {
                VervotechId: response.data.VervotechId,
                ProviderHotels: response.data.ProviderHotels,
            };
        } else {
            console.log(`[getProvidersMappingByVervotechId] - DIFFERENT RESPONSE DATA`);
            console.log(response.data);
        }
    } catch (err) {
        console.log(`[getProvidersMappingByVervotechId] - ERROR`);
        console.error(err);
    }
};

const getHotelsFromVervotechByIds = async () => {
    const processDoc = await VervotechMigrationProcess.findOne({
        migrationCompleted: false,
    }).select("_id migrationCompleted unmatchedProviders");

    if (processDoc) {
        if (processDoc.unmatchedProviders && processDoc.unmatchedProviders.length) {
            const unmatchedProviders = processDoc.unmatchedProviders;

            const chunkSize = 500;
            const PROVIDER_KEYS = {
                HotelBeds: "hbId",
                Ottila: "ottilaId",
            };

            for (let i = 0; i < unmatchedProviders.length; i += chunkSize) {
                const chunk = unmatchedProviders.slice(i, i + chunkSize);
                console.log(`Chunk ${i / chunkSize + 1}:`);

                if (chunk && chunk.length) {
                    const vervotechIds = chunk.map((doc) => doc.VervotechId);
                    const chunkProoviderIdObj = {};
                    chunk.forEach((doc) => {
                        chunkProoviderIdObj[doc.VervotechId] = doc;
                    });

                    if (
                        vervotechIds &&
                        vervotechIds.length &&
                        Object.keys(chunkProoviderIdObj).length &&
                        Object.keys(chunkProoviderIdObj).length === vervotechIds.length
                    ) {
                        try {
                            const { CuratedHotels } = await getCuratedContentByVervotechIds(
                                vervotechIds
                            );
                            for (const CuratedHotel of CuratedHotels) {
                                const hotelProvider =
                                    chunkProoviderIdObj[CuratedHotel.VervotechId].ProviderName;
                                const hotelProviderId =
                                    chunkProoviderIdObj[CuratedHotel.VervotechId].ProviderHotelId;

                                const hotelFormat = {
                                    ...CuratedHotel,
                                    [PROVIDER_KEYS[hotelProvider]]: hotelProviderId,
                                    vervotechId: CuratedHotel.VervotechId,
                                };

                                const hotel = await Hotel.create({
                                    ...hotelFormat,
                                });

                                console.log(
                                    `[HOTEL IMPORT] - HOTEL ADDED VERVOTECHID = ${CuratedHotel.VervotechId} NEW HOTEL ID = ${hotel._id}`
                                );
                            }
                        } catch (error) {
                            console.log(
                                `[HOTEL IMPORT] - [getCuratedContentByVervotechIds CALL ERROR] ERROR = ${error}`
                            );
                        }
                    } else {
                        console.log(`[HOTEL IMPORT] - vervotechIds ARRAY IS EMPTY`);
                    }
                } else {
                    console.log(`[HOTEL IMPORT] - CHUNK ARRAY IS EMPTY`);
                }
            }
        } else {
            console.log(
                `[HOTEL IMPORT] - [getHotelsFromVervotechByIds] unmatchedProviders ARRAY IS EMPTY`
            );
        }
    } else {
        console.log(`[HOTEL IMPORT] - [getHotelsFromVervotechByIds] PROCESSDOC NOT FOUND`);
    }
};

const getCuratedContentByVervotechIds = async (vervotechIds) => {
    const headers = {
        accountId: "travellerschoice",
        apikey: "b1d61509-73bb-4744-a22b-014e20a835ff",
    };

    let URL =
        "https://hotelmapping.vervotech.com" + "/api/3.0/content/GetCuratedContentByVervotechIds";

    const body = {
        VervotechIds: vervotechIds,
    };

    try {
        const response = await axios.post(URL, body, {
            headers,
        });

        if (
            response &&
            response.data &&
            response.data.CuratedHotels &&
            response.data.CuratedHotels.length
        ) {
            return {
                CuratedHotels: response.data.CuratedHotels,
            };
        } else {
            console.log(`[getCuratedContentByVervotechIds] - DIFFERENT RESPONSE DATA`);
            console.log(response.data);
        }
    } catch (err) {
        console.log(`[getCuratedContentByVervotechIds] - ERROR`);
        console.error(err);
    }
};

const starMarkupMigrationProcess = async () => {
    let hotelBedsProviderId;
    let ottilaProviderId;
    let contractProviderId;
    let iolxProviderId;

    console.log(`[MARKUP MIGRATION] - INITIALIZE`);

    try {
        const hotelProviders = await B2BHotelProvider.find();
        hotelProviders.forEach((provider) => {
            if (provider.name === "HotelBeds") {
                hotelBedsProviderId = provider._id;
            } else if (provider.name === "Ottila") {
                ottilaProviderId = provider._id;
            } else if (provider.name === "Contract") {
                contractProviderId = provider._id;
            } else if (provider.name === "Iolx") {
                iolxProviderId = provider._id;
            }
        });
    } catch (error) {
        console.log(`[MARKUP MIGRATION] - PROVIDERS FETCHING ERRROR`);
        return console.error(error);
    }

    const notUpdatedProfiles = [];
    const notUpdatedProfilesStarCatogories = [];

    if (
        isValidObjectId(hotelBedsProviderId) &&
        isValidObjectId(ottilaProviderId) &&
        isValidObjectId(contractProviderId) &&
        isValidObjectId(iolxProviderId)
    ) {
        try {
            let MarkupModel = MarkupProfile;
            // let MarkupModel = B2BMarkupProfile;
            // let MarkupModel = MarketStrategy;

            const markupProfiles = await MarkupModel.find({
                _id: { $in: ["65fc14953c4cd560853cc11a", "659d0b03cf0edd5e3dbf7362"] },
                // _id: "6540f3916c1270ab56d58f74",
                // resellerId: "65e69d3bb68ccda6ed3b07e4",
            }).lean();

            if (markupProfiles && markupProfiles.length) {
                for (const markupProfile of markupProfiles) {
                    const markupProfileHotels = markupProfile?.hotel;
                    const markupProfileStarCategories = markupProfile?.starCategory;

                    if (markupProfileStarCategories && markupProfileStarCategories.length) {
                        const updatedStarCategories = [...markupProfileStarCategories];
                        let starCategoryUpdated = false;

                        for (let i = 0; i < markupProfileStarCategories.length; i++) {
                            const starCategory = markupProfileStarCategories[i];

                            updatedStarCategories[i].markups = [
                                {
                                    hotelProviderId: contractProviderId,
                                    markup: updatedStarCategories[i].markup || 0,
                                    markupType: updatedStarCategories[i].markupType || "flat",
                                },
                                {
                                    hotelProviderId: hotelBedsProviderId,
                                    markup: updatedStarCategories[i].markupApi || 0,
                                    markupType: updatedStarCategories[i].markupTypeApi || "flat",
                                },
                                {
                                    hotelProviderId: ottilaProviderId,
                                    markup: updatedStarCategories[i].markupApi || 0,
                                    markupType: updatedStarCategories[i].markupTypeApi || "flat",
                                },
                                {
                                    hotelProviderId: iolxProviderId,
                                    markup: updatedStarCategories[i].markupApi || 0,
                                    markupType: updatedStarCategories[i].markupTypeApi || "flat",
                                },
                            ];
                            starCategoryUpdated = true;
                        }

                        if (updatedStarCategories) {
                            try {
                                await MarkupModel.updateOne(
                                    { _id: markupProfile._id },
                                    { $set: { starCategory: updatedStarCategories } }
                                );
                                console.log(
                                    `[MARKUP MIGRATION] - MARKUP_PROFILE STARCATEGORY UPDATED profileId: ${markupProfile._id}`
                                );
                            } catch (error) {
                                console.log(
                                    `[MARKUP MIGRATION] - MARKUP_PROFILE STARCATEGORY NOT UPDATE ERROR profileId: ${markupProfile._id}`
                                );
                                console.error(error);
                            }
                        } else {
                            console.log(
                                `[MARKUP MIGRATION] - MARKUP_PROFILE STARCATEGORY NOT UPDATED profileId: ${markupProfile._id}`
                            );
                            notUpdatedProfilesStarCatogories.push(markupProfile._id);
                        }
                    } else {
                        console.log(
                            `[MARKUP MIGRATION] - MARKUP_PROFILE STARCATEGORY NOT FOUND profileId: ${markupProfile._id}`
                        );
                    }

                    if (markupProfileHotels && markupProfileHotels.length) {
                        const updatedHotels = [...markupProfileHotels];
                        let hotelsUpdated = false;
                        for (let i = 0; i < markupProfileHotels.length; i++) {
                            const hotel = markupProfileHotels[i];
                            const hotelId = hotel?.hotelId;
                            const roomTypes = [...hotel?.roomTypes];

                            if (roomTypes && roomTypes.length) {
                                for (let j = 0; j < roomTypes.length; j++) {
                                    const roomType = roomTypes[j];
                                    const roomTypeId = roomType?.roomTypeId;
                                    if (isValidObjectId(roomTypeId)) {
                                        console.log(
                                            `[MARKUP MIGRATION] - ProfileId: ${markupProfile._id} hotelId: ${hotelId} roomTypeId: ${roomTypeId}`
                                        );

                                        try {
                                            const foundedContractRoomType = await RoomType.findOne({
                                                _id: roomTypeId,
                                            }).select("_id hotelBedRooms");

                                            const foundedHotelBedsRoomType = foundedContractRoomType
                                                ?.hotelBedRooms.length
                                                ? await HotelBedRoomType.find({
                                                      hbId: {
                                                          $in: foundedContractRoomType.hotelBedRooms,
                                                      },
                                                      hotel: hotelId,
                                                  }).select("_id")
                                                : undefined;

                                            const foundedOttilaRoomType =
                                                await OttilaRoomType.findOne({
                                                    _id: roomTypeId,
                                                }).select("_id");

                                            if (
                                                foundedContractRoomType &&
                                                foundedContractRoomType._id
                                            ) {
                                                updatedHotels[i].roomTypes[j].hotelProviderId =
                                                    contractProviderId;
                                                if (
                                                    !foundedOttilaRoomType &&
                                                    (!foundedHotelBedsRoomType?.length ||
                                                        foundedHotelBedsRoomType?.length < 1)
                                                ) {
                                                    // delete updatedHotels[i].roomTypes[j].markupApi;
                                                    // delete updatedHotels[i].roomTypes[j]
                                                    //     .markupTypeApi;
                                                }
                                            }
                                            if (
                                                foundedHotelBedsRoomType &&
                                                foundedHotelBedsRoomType.length
                                            ) {
                                                foundedHotelBedsRoomType.forEach((roomType) => {
                                                    if (
                                                        roomType._id.toString() ===
                                                        updatedHotels[i].roomTypes[
                                                            j
                                                        ].roomTypeId.toString()
                                                    ) {
                                                        updatedHotels[i].roomTypes[
                                                            j
                                                        ].hotelProviderId = hotelBedsProviderId;
                                                        updatedHotels[i].roomTypes[j].markup =
                                                            updatedHotels[i].roomTypes[j]
                                                                .markupApi || 0;
                                                        updatedHotels[i].roomTypes[j].markupType =
                                                            updatedHotels[i].roomTypes[j]
                                                                .markupTypeApi || "flat";
                                                    } else {
                                                        updatedHotels[i].roomTypes.push({
                                                            hotelProviderId: hotelBedsProviderId,
                                                            roomTypeId: roomType._id,
                                                            markup:
                                                                updatedHotels[i].roomTypes[j]
                                                                    .markupApi || 0,
                                                            markupType:
                                                                updatedHotels[i].roomTypes[j]
                                                                    .markupTypeApi || "flat",
                                                        });
                                                    }
                                                });
                                                // delete updatedHotels[i].roomTypes[j].markupApi;
                                                // delete updatedHotels[i].roomTypes[j].markupTypeApi;
                                            } else if (
                                                foundedOttilaRoomType &&
                                                foundedOttilaRoomType._id
                                            ) {
                                                updatedHotels[i].roomTypes[j].hotelProviderId =
                                                    ottilaProviderId;
                                                updatedHotels[i].roomTypes[j].markup =
                                                    updatedHotels[i].roomTypes[j].markupApi || 0;
                                                updatedHotels[i].roomTypes[j].markupType =
                                                    updatedHotels[i].roomTypes[j].markupTypeApi ||
                                                    "flat";

                                                // delete updatedHotels[i].roomTypes[j].markupApi;
                                                // delete updatedHotels[i].roomTypes[j].markupTypeApi;
                                            }
                                            hotelsUpdated = true;
                                        } catch (error) {
                                            console.log(
                                                `[MARKUP MIGRATION] - MARKUP_PROFILE ERROR`
                                            );
                                            console.error(error);
                                        }
                                    } else {
                                        console.log(
                                            `[MARKUP MIGRATION] - MARKUP_PROFILE INVALID ROOMTYPE ID: ${roomTypeId}`
                                        );
                                    }
                                }
                            } else {
                                console.log(
                                    `[MARKUP MIGRATION] - MARKUP_PROFILE ROMM TYPES NOT FOUND profileId: ${profile._id} hotelId: ${hotelId}`
                                );
                            }
                        }
                        if (hotelsUpdated) {
                            try {
                                await MarkupModel.updateOne(
                                    { _id: markupProfile._id },
                                    { $set: { hotel: updatedHotels } }
                                );
                                console.log(
                                    `[MARKUP MIGRATION] - MARKUP_PROFILE HOTELS UPDATED profileId: ${markupProfile._id}`
                                );
                            } catch (error) {
                                console.log(
                                    `[MARKUP MIGRATION] - MARKUP_PROFILE HOTELS NOT UPDATE ERROR profileId: ${markupProfile._id}`
                                );
                                console.error(error);
                            }
                        } else {
                            console.log(
                                `[MARKUP MIGRATION] - MARKUP_PROFILE HOTELS NOT UPDATED profileId: ${markupProfile._id}`
                            );
                            notUpdatedProfiles.push(markupProfile._id);
                        }
                    } else {
                        console.log(
                            `[MARKUP MIGRATION] - MARKUP_PROFILE HOTELS NOT FOUND profileId: ${markupProfile._id}`
                        );
                    }
                }

                if (notUpdatedProfilesStarCatogories && notUpdatedProfilesStarCatogories.length) {
                    addIdsToJsonFile(
                        `src/b2b/helpers/hotel/notUpdatedStarCategories.json`,
                        notUpdatedProfilesStarCatogories
                    );
                }

                if (notUpdatedProfiles && notUpdatedProfiles.length) {
                    addIdsToJsonFile(
                        `src/b2b/helpers/hotel/notUpdatedHotels.json`,
                        notUpdatedProfiles
                    );
                }

                console.log(
                    `[MARKUP MIGRATION] -  ******************COMPLETED********************`
                );
            } else {
                console.log(`[MARKUP MIGRATION] - MARKUP_PROFILES NOT FOUND`);
            }
        } catch (error) {
            console.log(`[MARKUP MIGRATION] - MARKUPS FETCHING ERRROR`);
            console.error(error);
        }
    } else {
        console.log(
            `[MARKUP MIGRATION] - INVALID PROVIDER IDS = hotelBedsProviderId: ${hotelBedsProviderId}, ottilaProviderId: ${ottilaProviderId}, contractProviderId: ${contractProviderId} iolxProviderId: ${iolxProviderId}`
        );
    }
};

const updateOttilaIdFromJSON = async () => {
    const datas = ottilaIdsData.data;
    const notUpdatedArr = [];

    const startIndex = 0;

    let lastProcessIndex = 0;

    console.log("[OTTILA ID IMPORT] - STARTED");
    if (datas && datas.length) {
        for (let i = startIndex; i < datas.length; i++) {
            if (i === 90) {
                console.log("");
            }
            lastProcessIndex = i;
            const data = datas[i];
            let added = false;
            console.log(
                `[OTTILA ID IMPORT] - HOTELID: ${data?._id} OTTILAID : ${
                    data?.ottilaId
                } currentIndex: ${i} lastIndex:${datas.length - 1}`
            );
            if (data?._id && data?.ottilaId && data?.provider === "Ottila") {
                try {
                    const hotel = await Hotel.findOneAndUpdate(
                        { _id: data._id.id },
                        {
                            $set: {
                                ottilaId: data.ottilaId,
                                ottilaIdAdded: true,
                            },
                        }
                    );
                    if (hotel) {
                        added = true;
                        console.log(
                            `[OTTILA ID IMPORT] - ADDED  HOTELID: ${data._id} OTTILAID : ${data.ottilaId}`
                        );
                    }
                } catch (error) {
                    lastProcessIndex = i;
                    console.log(
                        `[OTTILA ID IMPORT] - ERROR  HOTELID: ${data._id} OTTILAID : ${data.ottilaId}`
                    );
                    console.error(error);
                    break;
                }
            }
            if (!added) {
                notUpdatedArr.push(data);
            }
        }

        console.log(`[OTTILA ID IMPORT] - not updated data count: ${notUpdatedArr.length}`);

        if (notUpdatedArr && notUpdatedArr.length) {
            addIdsToJsonFile("src/b2b/helpers/hotel/notUpdated.json", notUpdatedArr);
        }

        console.log(`[OTTILA ID IMPORT] - lastProcessIndex: ${lastProcessIndex}`);

        console.log(
            "[OTTILA ID IMPORT] - ************************************ COMPLETED ****************************************"
        );
    } else {
        console.log("[OTTILA ID IMPORT] - NO DATA FOUND");
    }
};

module.exports = {
    getVervotechMatchedHotelMapping,
    getVervotechIdsDBSave,
    getVervotechMatchedHotelMappingV2,
    starMarkupMigrationProcess,
    startMigrationForPendingHbIds,
    updateOttilaIdFromJSON,
};
