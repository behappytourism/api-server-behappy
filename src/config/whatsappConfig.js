const { Client, RemoteAuth, LocalAuth } = require("whatsapp-web.js");
const { MongoStore } = require("wwebjs-mongo");
const mongoose = require("mongoose");
const { MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const { WhatsappConfig } = require("../models");
const { default: axios } = require("axios");
const store = new MongoStore({ mongoose: mongoose });

let client = new Client({
    // authStrategy: new RemoteAuth({
    //     store: store,
    //     backupSyncIntervalMs: 300000,
    // }),
    authStrategy: new LocalAuth({
        dataPath: "whatsappDb",
    }),
    puppeteer: {
        args: ["--no-sandbox"],
    },
});

const connectWhatsApp = async (req, res) => {
    try {
        console.log("connectWhatsApp", process.env.WHATSAPP_SERVER_URL);
        const response = await axios.get(`${process.env.WHATSAPP_SERVER_URL}/whatsapp/connect`);

        console.log(response.data);
    } catch (err) {
        throw err?.response?.data?.error || err;
    }
};

const getQrCodeHelper = async () => {
    try {
        const response = await axios.get(`${process.env.WHATSAPP_SERVER_URL}/whatsapp/qr-code`);
        const whatsappConfig = await WhatsappConfig.findOneAndUpdate(
            { settingsNumber: 1 },
            { qrcode: response.data },
            {
                new: true,
            }
        );
        console.log(response.data, "response.data");
        return response.data;
    } catch (err) {
        console.log(err, "err");
        throw err?.response?.data?.error || err;
    }
};

const getReadyCheckHelper = async () => {
    try {
        const response = await axios.get(
            `${process.env.WHATSAPP_SERVER_URL}/whatsapp/check-connected`
        );
        console.log(response.data, "data");
        if (response?.data === true) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        console.log("Error in getReadyCheckHelper:", err);
        throw err?.response?.data?.error || err;
    }
};

const logoutHelper = async () => {
    try {
        const response = await axios.get(`${process.env.WHATSAPP_SERVER_URL}/whatsapp/logout`);
        console.log(response.data, "data");
        if (response?.data === true) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        console.log(err, "err");
        throw err?.response?.data?.error || err;
    }
};

// // const sendMessageHelper = async ({ number, message }) => {
// //     try {
// //         client
// //             .sendMessage(`${number}@c.us`, message)
// //             .then(() => {
// //                 console.error("message sended");

// //                 return { status: "success", message, number };
// //             })
// //             .catch((err) => {
// //                 console.error("Error sending message:", err);
// //                 throw Error("Internal Server Error");
// //             });
// //     } catch (err) {
// //         console.log(err);
// //     }
// // };

const stateHelper = async () => {
    try {
        const response = await axios.get(
            `${process.env.WHATSAPP_SERVER_URL}/whatsapp/state-helper`
        );
        console.log(response.data, "data");
        if (response?.data === true) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        throw err?.response?.data?.error || err;
    }
};

const sendMessageHelper = async ({ type, url, path, message, number }) => {
    try {
        const response = await axios.post(
            `${process.env.WHATSAPP_SERVER_URL}/whatsapp/send-message`,
            {
                type,
                url,
                path,
                message,
                number,
            }
        );
        if (response?.data === true) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        console.log(err);
        throw err?.response?.data?.error || err;
    }
};

module.exports = {
    connectWhatsApp,
    getQrCodeHelper,
    sendMessageHelper,
    getReadyCheckHelper,
    logoutHelper,
    stateHelper,
};
