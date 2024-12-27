const { sendErrorResponse } = require("../../helpers");
const { B2cHomeSettings } = require("../../models");

module.exports = {
    getTermsAndConditions: async (req, res) => {
        try {
            const b2bFrontendSettings = await B2cHomeSettings.findOne({}).lean();

            res.status(200).json({
                termsAndConditions: b2bFrontendSettings?.termsAndConditions || "",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getPrivacyAndPolicies: async (req, res) => {
        try {
            const b2bFrontendSettings = await B2cHomeSettings.findOne({}).lean();

            res.status(200).json({
                privacyAndPolicies: b2bFrontendSettings?.privacyAndPolicy || "",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
