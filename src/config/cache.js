const mongoose = require("mongoose");
const redis = require("redis");
const util = require("util");
const { getDates } = require("../utils");

let client;

mongoose.Query.prototype.cache = function () {
    this.useCache = true;

    return this;
};

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.exec = async function () {
    if (!this.useCache) {
        return exec.apply(this, arguments);
    }

    const key = JSON.stringify({
        ...this.getQuery(),
        collection: this.mongooseCollection.name,
        op: this.op,
        options: this.options,
    });

    const cacheValue = await client.GET(key);

    if (cacheValue) {
        console.log("Using cached value");
        const doc = JSON.parse(cacheValue);

        // return Array.isArray(doc) ? doc.map((d) => new this.model(d)) : new this.model(doc);
        return doc;
    }

    const result = await exec.apply(this, arguments);

    if (result) {
        client.SET(key, JSON.stringify(result), "EX", 60 * 60 * 12);
        return result;
    } else {
        return null;
    }
};

module.exports = {
    connectRedisDb: async () => {
        try {
            const redisUrl = "redis://127.0.0.1:6379";
            client = redis.createClient(redisUrl);

            client.connect().then(() => {
                console.log("Redis server connected");
            });

            client.get = util.promisify(client.get);
        } catch (err) {
            throw err;
        }
    },
    saveCustomCache: (key, result, expiry = 60 * 60 * 12) => {
        client.SET(key, JSON.stringify(result), "EX", expiry);
    },

    getSavedCache: async (key) => {
        const cacheValue = await client.GET(key);

        return JSON.parse(cacheValue);
    },

    clearCache: async (key) => {
        await client.DEL(key);
    },

    updateFlightFareCache: async ({
        origin,
        destination,
        travelClass,
        airlineName,
        airlineCode,
        flightNumber,
        date,
        fare,
        searchId,
        type,
        outBoundDate,
    }) => {
        const key = `${origin}-${destination}-${travelClass}`;
        const cacheValue = await client.GET(key);

        console.log(key);

        let result = [];
        if (cacheValue) {
            result = JSON.parse(cacheValue) || [];
        }

        const objIndex = result?.findIndex((item) => {
            return (
                item?.date === date &&
                item?.type === type &&
                item?.outBoundDate === (item?.type === "return" ? outBoundDate : null)
            );
        });
        if (objIndex !== -1) {
            if (result[objIndex]?.fare > fare) {
                result[objIndex] = {
                    airlineName,
                    airlineCode,
                    flightNumber,
                    date,
                    fare,
                    searchId,
                    type,
                    outBoundDate,
                };
            }
        } else {
            result.push({
                airlineName,
                airlineCode,
                flightNumber,
                date,
                fare,
                searchId,
                type,
                outBoundDate,
            });
        }
        client.SET(key, JSON.stringify(result));
    },

    getFlightFareFromCache: async ({
        origin,
        destination,
        travelClass,
        startDate,
        endDate,
        type,
        outBoundDate,
    }) => {
        try {
            const key = `${origin}-${destination}-${travelClass}`;

            const result = [];
            const cacheValue = await client.GET(key);
            if (cacheValue) {
                const dates = getDates(startDate, endDate);

                const parsedCacheValue = JSON.parse(cacheValue);

                if (parsedCacheValue) {
                    for (const date of dates) {
                        const matchedValue = parsedCacheValue.find((item) => {
                            return (
                                item?.date === date &&
                                item?.type === type &&
                                item?.outBoundDate ===
                                    (item?.type === "return" ? outBoundDate : null)
                            );
                        });
                        if (matchedValue) {
                            result.push({
                                airlineName: matchedValue?.airlineName,
                                airlineCode: matchedValue?.airlineCode,
                                flightNumber: matchedValue?.flightNumber,
                                date,
                                fare: matchedValue?.fare,
                                searchId: matchedValue?.searchId,
                            });
                        }
                    }
                }
            }

            return result;
        } catch (err) {
            console.log(err);
        }
    },

    updateTicketCountCache: async ({
        attraction,
        activity,
        adultCount,
        childCount,
        infantCount,
    }) => {
        const key = `${attraction}-${activity}`;

        console.log(key, "key", attraction, activity, adultCount, childCount, infantCount);
        const cacheValue = await client.GET(key);

        let result = {
            adultCount,
            childCount,
            infantCount,
        };

        client.SET(key, JSON.stringify(result));
    },

    getTicketCountCache: async ({ attraction, activity }) => {
        try {
            const key = `${attraction}-${activity}`;
            const cacheValue = await client.GET(key);
            console.log(key, cacheValue, "cache");
            return JSON.parse(cacheValue);
        } catch (err) {
            console.log(err);
        }
    },

    flushRedisCache: async () => {
        await client.FLUSHALL();
    },
};
