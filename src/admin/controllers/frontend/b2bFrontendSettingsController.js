const { B2BFrontendSetting } = require("../../../models");

module.exports = {
    upsertB2bSettings: async (req, res) => {
        const { termsAndConditions, privacyAndPolicy } = req.body;
        console.log(privacyAndPolicy, "privacyAndPolicy");
        try {
            // Find the existing document or create a new one
            const b2bTermsAndConditions = await B2BFrontendSetting.findOneAndUpdate(
                {},
                {
                    $set: {
                        termsAndConditions: termsAndConditions,
                        privacyAndPolicy: privacyAndPolicy,
                    },
                },
                { upsert: true, new: true }
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
            let b2bSettings = await B2BFrontendSetting.findOne({});

            if (!b2bSettings) {
                return sendErrorResponse(res, 400, " Settings not added ");
            }

            res.status(200).json(b2bSettings);
        } catch (error) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
};
