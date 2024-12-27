const { sendErrorResponse } = require("../../../helpers");
const { B2BFrontendSetting, B2bHomeSettings } = require("../../../models");
const { b2bGetInTouch } = require("../../models");

module.exports = {
    getTermsAndConditions: async (req, res) => {
        try {
            const b2bFrontendSettings = await B2bHomeSettings.findOne({}).lean();

            res.status(200).json({
                termsAndConditions: b2bFrontendSettings?.termsAndConditions || "",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getPrivacyAndPolicies: async (req, res) => {
        try {
            const b2bFrontendSettings = await B2bHomeSettings.findOne({}).lean();

            res.status(200).json({
                privacyAndPolicies: b2bFrontendSettings?.privacyAndPolicy || "",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addGetInTouchMessage: async (req, res) => {
        try {
            const getInTouchData = await b2bGetInTouch.create(req.body);
            res.status(200).json({
                message: "Created",
                getInTouchData,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
