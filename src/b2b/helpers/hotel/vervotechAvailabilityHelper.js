const { default: axios } = require("axios");

const config = {
    accountId: process.env.VERVOTECH_ACCOUNTID,
    token: process.env.VERVOTECH_TOKEN,
};

const ROOM_MAPPING_BASE_URL = "https://roommapping.vervotech.com";

function convertSqftToSqMeter(sqftString) {
    // Check if the string contains a hyphen
    if (sqftString.includes("-")) {
        // Extracting the minimum and maximum values from the string
        const [minSqft, maxSqft] = sqftString.split("-").map(Number);

        // Conversion factor
        const sqftToSqMeter = 0.092903;

        // Converting minimum and maximum values to square meters
        const minSqMeter = minSqft * sqftToSqMeter;
        const maxSqMeter = maxSqft * sqftToSqMeter;

        // Returning the result as a string
        return `${minSqMeter.toFixed(2)} - ${maxSqMeter.toFixed(2)}`;
    } else {
        // If no hyphen, consider it as a single value
        const sqft = parseFloat(sqftString);
        const sqftToSqMeter = 0.092903;
        const sqMeter = sqft * sqftToSqMeter;
        return `${sqMeter.toFixed(2)}`;
    }
}

const getVervotechMatchedHotelRooms = async (payload) => {
    const URL = ROOM_MAPPING_BASE_URL + "/api/2.0/mapping/rooms";

    const headers = {
        accountId: config.accountId,
        token: config.token,
        correlationId: "test",
        culture: "en-US",
    };

    try {
        const response = await axios.post(
            URL,
            { roomRates: payload },
            {
                headers,
            }
        );

        return response?.data;
    } catch (error) {
        console.error(error);
    }
};

module.exports = {
    getVervotechMatchedHotelRooms,
    convertSqftToSqMeter,
};
