const { sendErrorResponse } = require("../../../helpers");
const { WhatsappManagement } = require("../../../models");

module.exports = {
    addWhatsappManagment: async (req, res) => {
        try {
            const { name, phoneCode, phoneNumber } = req.body;

            const whatsappManagement = await WhatsappManagement.findOneAndUpdate(
                {
                    name,
                },
                {
                    phoneCode,
                    phoneNumber,
                    name,
                },
                { upsert: true, new: true }
            );

            res.status(200).json(whatsappManagement);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllWhatsappManagement: async (req, res) => {
        try {
            const whatsappManagement = await WhatsappManagement.find({});
            res.status(200).json(whatsappManagement);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    changeManagementStatus: async (req, res) => {
        try {
            const { name, status } = req.body;

            const whatsappManagement = await WhatsappManagement.findOneAndUpdate(
                {
                    name,
                },
                {
                    status,
                },
                { new: true }
            );
            if (!whatsappManagement) {
                return sendErrorResponse(res, 400, "data not found");
            }
            res.status(200).json(whatsappManagement);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
