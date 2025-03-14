const { isValidObjectId } = require("mongoose");
const { convertCurrency, convertCurrencyUSD } = require("../../b2b/helpers/currencyHelpers");

const { sendErrorResponse } = require("../../helpers");
const {
    Attraction,
    AttractionReview,
    User,
    AffiliateUser,
    AffiliateRedeem,
    FinancialUserData,
    B2CWallet,
} = require("../../models");
const AffiliateSetting = require("../../models/affiliate/affiliateSettings.model");
const { affiliateRedeemSchema } = require("../../validations/affiliate/affiliateRedeem.schema");

module.exports = {
    initateAffiliateRedeemRequest: async (req, res) => {
        try {
            const { points } = req.body;

            // const { _, error } = affiliateRedeemSchema.validate(req.body);
            // if (error) {
            //     return sendErrorResponse(res, 400, error.details[0].message);
            // }
            // let financialUserData = await FinancialUserData.findOne({ _id: selectedId });
            // if (!financialUserData) {
            //     return sendErrorResponse(res, 400, "financial data not found");
            // }

            // if (financialUserData.type === "crypto" && currency !== "USD") {
            //     return sendErrorResponse(res, 400, "USD option only available for type crypto");
            // }

            const affiliateSettings = await AffiliateSetting.findOne({});

            const affiliateUser = await AffiliateUser.findOne({
                user: req.user._id,
                isActive: true,
            });

            if (!affiliateUser) {
                return sendErrorResponse(res, 400, "Affiliate user not found");
            }

            if (points < 50) {
                return sendErrorResponse(
                    res,
                    400,
                    "Minimum 50 points required for reedem to wallet"
                );
            }

            if (points > affiliateUser.totalPoints) {
                return sendErrorResponse(res, 400, "Affiliate have not enough points");
            }

            let amount = (1 / affiliateSettings.pointValue) * points;

            let b2cWallet = await B2CWallet.findOne({ user: req.user._id });
            if (!b2cWallet) {
                b2cWallet = new B2CWallet({
                    balance: 0,
                    user: req.user._id,
                });
            }
            await b2cWallet.save();

            // const totalAmount = await convertCurrencyUSD(amount, currency);
            const totalAmount = Number(amount);

            const feeDeduction = Number(affiliateSettings.deductionFee / 100) * totalAmount;

            const finalAmount = Number(totalAmount) - Number(feeDeduction);

            const newRedeemRequest = new AffiliateRedeem({
                user: req.user._id,
                points,
                // financialData: financialUserData._id,
                amount: finalAmount,
                status: "initiated",
                feeDeduction: feeDeduction,
                // currency,
            });

            await newRedeemRequest.save();

            res.status(200).json({
                redeemRequest: newRedeemRequest._id,
                amount: finalAmount,
                feeDeduction: feeDeduction,
                // currency: currency,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    completeAffiliateRedeemRequest: async (req, res) => {
        try {
            const { redeemId } = req.params;

            const affiliateUser = await AffiliateUser.findOne({
                user: req.user._id,
                isActive: true,
            });

            if (!affiliateUser) {
                return sendErrorResponse(res, 400, "Affiliate user not found");
            }

            const affiliateRedeemRequest = await AffiliateRedeem.findById(redeemId);
            if (!affiliateRedeemRequest) {
                return sendErrorResponse(res, 400, "Affiliate not found");
            }

            if (affiliateRedeemRequest?.status !== "initiated") {
                return sendErrorResponse(res, 400, "Affiliate request already  progressed");
            }

            let b2cWallet = await B2CWallet.findOne({ user: req.user._id });

            b2cWallet.balance += Number(affiliateRedeemRequest.amount);
            affiliateUser.totalPoints -= Number(affiliateRedeemRequest?.points);

            affiliateRedeemRequest.status = "approved";

            await affiliateUser.save();
            await b2cWallet.save();
            await affiliateRedeemRequest.save();

            res.status(200).json({
                redeemRequest: affiliateRedeemRequest._id,
                message: "Amount had been added to your wallet ",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getUserRedeemRequests: async (req, res) => {
        try {
            const { limit = 10, skip = 0, status } = req.query;

            let filters = {};
            if (status && status !== "") {
                filters.status = status;
            }

            filters.user = req?.user?._id;

            const affiliateRequests = await AffiliateRedeem.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalRequest = await AffiliateRedeem.find(filters).count();

            res.status(200).json({
                affiliateRequests,
                totalRequest,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getReedemInitalData: async (req, res) => {
        try {
            const affiliateSettings = await AffiliateSetting.findOne({}).select(
                "deductionFee pointValue"
            );
            if (!affiliateSettings) {
                return sendErrorResponse(res, 400, "Affiliate settings not find ");
            }
            res.status(200).json(affiliateSettings);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
