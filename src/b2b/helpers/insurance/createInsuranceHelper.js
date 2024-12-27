const axios = require("axios");
const { InsurancePlan } = require("../../../models");
const createInsurnaceSingleContractUtils = require("../../utils/insurance/createInsuranceSingleContractUtils");
const createInsurnaceUtils = require("../../utils/insurance/createInsuranceUtils");
let bearerToken = "";
const puppeteer = require("puppeteer");
const path = require("path");
const createInsurnaceGroupContractUtils = require("../../utils/insurance/createInsuranceGroupContract");

const getLogin = async () => {
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
                // AgentID: agentId,
            },
        });

        if (response?.data.access_token) {
            bearerToken = response?.data.access_token;
        }

        return response.data.access_token;
    } catch (err) {
        console.log(err.message);
    }
};

const createInsuranceQuotation = async (generalData, beneficiaryData) => {
    try {
        let token = await getLogin();

        const baseUrl = process.env.INSURANCE_SERVER_URL;
        const path = `/v2/get-plans`;
        const url = baseUrl + path;

        const data = createInsurnaceUtils(generalData, beneficiaryData);

        const response = await axios.post(url, data, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
                Tenant: process.env.CYGNET_TENANT,
            },
        });

        if (!response.data.plans) {
            throw new Error(response.data.message);
        }

        return response?.data?.plans;
    } catch (err) {
        console.log(err);
        throw new Error(err.message);
    }
};

const createContract = async (insuranceContract, insurancePlan) => {
    try {
        let token = await getLogin();

        if (insuranceContract.travelType === "SG") {
            const baseUrl = process.env.INSURANCE_SERVER_URL;
            const path = `/v2/create-contract`;
            const url = baseUrl + path;

            let price = insuranceContract.beneficiaryData[0].priceId;
            let plan = insurancePlan.insuranceId;
            let discount = 0;
            let duration = Number(insuranceContract.beneficiaryData[0].consecutiveDays);

            const data = createInsurnaceSingleContractUtils(
                insuranceContract,
                price,
                plan,
                discount,
                duration
            );

            const response = await axios.post(url, data, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                    Tenant: process.env.CYGNET_TENANT,
                },
            });

            if (!response?.data?.contract_id) {
                console.log(response.data, "response data");
                throw new Error(response?.data?.message || "something went wrong");
            }

            return {
                contractId: response.data.contract_id,
            };
        } else if (insuranceContract.travelType === "FM") {
            const baseUrl = process.env.INSURANCE_SERVER_URL;
            const path = `/v2/create-contract`;
            const url = baseUrl + path;

            let plan = insurancePlan.insuranceId;
            let discount = 0;
            let duration = insuranceContract.beneficiaryData[0].ConsecutiveDays;

            const data = createInsurnaceGroupContractUtils(
                insuranceContract,
                plan,
                discount,
                duration
            );

            const response = await axios.post(url, data, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                    Tenant: process.env.CYGNET_TENANT,
                },
            });

            if (!response?.data?.contract_id) {
                throw new Error(response?.data?.message);
            }

            return {
                contractId: response?.data?.contract_id,
            };
        } else {
            throw new Error(`${generalData?.travelType} not available now `);
        }
    } catch (err) {
        throw new Error(err?.response?.data?.message || "something went wrong");
    }
};

const downloadContractPdf = async ({ contractId, res }) => {
    try {
        let token = await getLogin();

        const baseUrl = process.env.INSURANCE_SERVER_URL;
        const path = `/v2/contract-pdf/${contractId}`;
        const url = baseUrl + path;

        const response = await axios.get(url, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
                Tenant: process.env.CYGNET_TENANT,
            },
            responseType: "arraybuffer",
        });

        res.setHeader("Content-disposition", `attachment; filename=contract.pdf`);
        res.setHeader("Content-type", "application/pdf");

        res.send(response.data);
    } catch (err) {
        console.log(err, "err");
        throw new Error(err.message);
    }
};

module.exports = { createInsuranceQuotation, createContract, downloadContractPdf };
