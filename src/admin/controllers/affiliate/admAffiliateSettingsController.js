const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { AttractionCategory, AffiliateSettings } = require("../../../models");
const {
    admAffiliateSettingsSchema,
} = require("../../validations/affiliate/admAffiliateSettings.schema");

module.exports = {
    listAffiliateSettings: async (req, res) => {
        try {
            let affiliateSettings = await AffiliateSettings.findOne({});

            if (!affiliateSettings) {
                return sendErrorResponse(res, 400, "Affiliate Settings not added ");
            }

            res.status(200).json(affiliateSettings);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAffiliateSettings: async (req, res) => {
        try {
            const { termsAndConditions, redeemOptions, policy, pointValue, deductionFee } =
                req.body;
            const { _, error } = admAffiliateSettingsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            console.log(req.body, "body");

            let affiliateSettings = await AffiliateSettings.findOneAndUpdate(
                {},
                { termsAndConditions, redeemOptions, policy, pointValue, deductionFee },
                { new: true, upsert: true }
            );

            res.status(200).json({ affiliateSettings, message: "updated successfully" });
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },
};
