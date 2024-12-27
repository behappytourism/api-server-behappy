const { B2BFrontendSetting, B2CFrontendSetting } = require("../../../models");

module.exports = {
    upsertB2cSettings: async (req, res) => {
        const { termsAndConditions, privacyAndPolicy } = req.body;

        try {
            // Find the existing document or create a new one
            const b2bTermsAndConditions = await B2CFrontendSetting.findOneAndUpdate(
                {},
                { $set: { termsAndConditions: termsAndConditions, privacyAndPolicy } },
                { upsert: true, new: true, useFindAndModify: false }
            );

            res.status(200).json(b2bTermsAndConditions);
        } catch (error) {
            // Handle any errors
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
    
    getFrontendSettings: async (req, res) => {
        try {
            let b2cSettings = await B2CFrontendSetting.findOne({});

            if (!b2cSettings) {
                return sendErrorResponse(res, 400, " Settings not added ");
            }

            res.status(200).json(b2cSettings);
        } catch (error) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
};
