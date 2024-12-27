const axios = require("axios");
let bearerToken = "";
const { getInsurancePlans } = require("../../utils");

const getLogin = async (req, res) => {
    try {
        const baseUrl = process.env.INSURANCE_SERVER_URL;
        const path = `/login`;
        const url = baseUrl + path;

        const headers = {
            "Content-Type": "application/json",
            Accept: "application/json",
        };

        let body = {
            username: process.env.CYGNET_USERNAME,
            password: process.env.CYGNET_PASSWORD,
        };

        let response = await axios.post(url, body, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        if (response?.data.access_token) {
            bearerToken = response?.data.access_token;
        }

        return bearerToken;
    } catch (err) {
        console.log(err.message);
    }
};

const fetchInsurancePlans = async () => {
    try {
        let token = await getLogin();
        const baseUrl = process.env.INSURANCE_SERVER_URL;
        const path = `/v2/get-plans`;
        const url = baseUrl + path;

        const data = getInsurancePlans();
        const response = await axios.post(url, data, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
                Tenant: process.env.CYGNET_TENANT,
            },
        });

        return response.data;
    } catch (err) {
        console.log(err.message, "error");
    }
};

module.exports = { fetchInsurancePlans };
