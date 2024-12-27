const axios = require("axios");

module.exports = {
    flightAvailabilitySearchRequest: async (request) => {
        try {
            const baseURL = process.env.FLIGHT_SERVER_URL;

            const endpointURL = "/api/v1/flights/search/availability";

            const requestBody = request;

            let response = await axios.post(baseURL + endpointURL, requestBody);

            return response.data;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    },

    addToCartRequest: async (request) => {
        try {
            const baseURL = process.env.FLIGHT_SERVER_URL;

            const endpointURL = "/api/v1/flights/add-to-cart";

            const requestBody = request;

            let response = await axios.post(baseURL + endpointURL, requestBody);

            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.error);
            } else {
                throw error;
            }
        }
    },

    getSingleFligthDetails: async (tbId) => {
        try {
            const baseURL = process.env.FLIGHT_SERVER_URL;

            const endpointURL = `/api/v1/flights/details/${tbId}`;

            let response = await axios.get(baseURL + endpointURL);

            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.error);
            } else {
                throw error;
            }
        }
    },

    getSingleFlightDetailsWithAncillaryRequest: async (tbId) => {
        try {
            const baseURL = process.env.FLIGHT_SERVER_URL;

            const endpointURL = `/api/v1/flights/details/${tbId}/ancillaries`;

            let response = await axios.get(baseURL + endpointURL);

            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.error);
            } else {
                throw error;
            }
        }
    },

    addCustomerFlightDetailsRequest: async (request) => {
        try {
            const baseURL = process.env.FLIGHT_SERVER_URL;

            const endpointURL = "/api/v1/flights/passenger-details/add";

            const requestBody = request;

            let response = await axios.post(baseURL + endpointURL, requestBody);

            return response.data;
        } catch (error) {
            console.log(error.response.data, "error");
            if (error.response && error.response.data) {
                throw new Error(error.response.data.error);
            } else {
                throw error;
            }
        }
    },

    addSelectedAncillariesRequest: async (request) => {
        try {
            const baseURL = process.env.FLIGHT_SERVER_URL;

            const endpointURL = "/api/v1/flights/ancillaries/add";

            const requestBody = request;

            let response = await axios.post(baseURL + endpointURL, requestBody);

            return response.data;
        } catch (error) {
            console.log(error, "error");

            if (error.response && error.response.data) {
                throw new Error(error.response.data.error);
            } else {
                throw error;
            }
        }
    },

    initateFligthBookingRequest: async (request) => {
        try {
            const baseURL = process.env.FLIGHT_SERVER_URL;

            const endpointURL = `/api/v1/flights/bookings/initiate`;

            const requestBody = request;

            let response = await axios.post(baseURL + endpointURL, requestBody);

            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.error);
            } else {
                throw error;
            }
        }
    },

    completeFligthBookingRequest: async (request) => {
        try {
            const baseURL = process.env.FLIGHT_SERVER_URL;

            const endpointURL = "/api/v1/flights/bookings/complete";

            const requestBody = request;

            let response = await axios.post(baseURL + endpointURL, requestBody);

            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.error);
            } else {
                throw error;
            }
        }
    },

    flightBookingPdfRequest: async ({ referenceNumber, totalMarkup, reseller }) => {
        try {
            const baseURL = process.env.FLIGHT_SERVER_URL;

            const endpointURL = `/api/v1/bookings/single/download-pdf/${referenceNumber}`;
            let response = await axios.post(
                baseURL + endpointURL,
                {
                    companyName: reseller?.companyName
                        ? reseller?.companyName
                        : process.env.COMPANY_NAME,
                    companyLogo: reseller?.companyLogo
                        ? reseller?.companyLogo
                        : process.env.COMPANY_LOGO,
                    yourMarkupAmount: totalMarkup,
                },
                {
                    responseType: "arraybuffer",
                }
            );

            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.error);
            } else {
                throw error;
            }
        }
    },
};
