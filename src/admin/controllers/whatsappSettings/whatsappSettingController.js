const {
    getQrCodeHelper,
    sendMessageHelper,
    getReadyCheckHelper,
    logoutHelper,
    stateHelper,
} = require("../../../config/whatsappConfig");
const { sendErrorResponse } = require("../../../helpers");
const { WhatsappConfig } = require("../../../models");

module.exports = {
    addWhatsappUser: async (req, res) => {
        try {
            const { name, phoneCode, phoneNumber } = req.body;
            let qrCode = await getQrCodeHelper();

            if (!qrCode) {
                return sendErrorResponse(
                    res,
                    400,
                    "whatsapp already  configured or something went wrong ! refresh and try again "
                );
            }
            const whatsappConfig = await WhatsappConfig.findOneAndUpdate(
                { settingsNumber: 1 },
                { name, phoneCode, phoneNumber, qrCode, status: false },
                { upsert: true, new: true }
            );
            res.status(200).json(whatsappConfig);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    reloadWhatsapp: async (req, res) => {
        try {
            let qrCode = await getQrCodeHelper();

            if (!qrCode) {
                return sendErrorResponse(res, 400, "whatsapp already  configured");
            }

            res.status(200).json(qrCode);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    confirmWhatsapp: async (req, res) => {
        try {
            let status = await getReadyCheckHelper();

            if (status === false) {
                return sendErrorResponse(
                    res,
                    400,
                    "whatsapp is not configured.Reload Qr code and connect to whatsapp"
                );
            }

            const whatsappConfig = await WhatsappConfig.findOneAndUpdate(
                { settingsNumber: 1 },
                { status: true },
                { new: true }
            );

            res.status(200).json(whatsappConfig);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    sendWhatsappMessage: async (req, res) => {
        try {
            const { type, url, path, message, number } = req.body;

            const messageReturn = await sendMessageHelper({ type, url, path, message, number });

            res.status(200).json(messageReturn);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllWhatsappDetails: async (req, res) => {
        try {
            const whatsappConfig = await WhatsappConfig.findOne({ settingsNumber: 1 }).lean();
            const status = await stateHelper();
            res.status(200).json([{ ...whatsappConfig, status: status }]);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    logoutWhatsappService: async (req, res) => {
        try {
            const logout = await logoutHelper();

            if (logout === false) {
                return sendErrorResponse(res, 400, "cannot log out something went wrong");
            }
            const whatsappConfig = await WhatsappConfig.findOneAndUpdate(
                { settingsNumber: 1 },
                { status: false },
                { new: true }
            );
            res.status(200).json(logout);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },
};
