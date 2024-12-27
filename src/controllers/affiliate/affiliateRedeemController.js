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
} = require("../../models");
const AffiliateSetting = require("../../models/affiliate/affiliateSettings.model");
const { affiliateRedeemSchema } = require("../../validations/affiliate/affiliateRedeem.schema");

module.exports = {
    initateAffiliateRedeemRequest: async (req, res) => {
        try {
            const { selectedId, points, currency } = req.body;

            const { _, error } = affiliateRedeemSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }
            let financialUserData = await FinancialUserData.findOne({ _id: selectedId });
            if (!financialUserData) {
                return sendErrorResponse(res, 400, "financial data not found");
            }

            if (financialUserData.type === "crypto" && currency !== "USD") {
                return sendErrorResponse(res, 400, "USD option only available for type crypto");
            }

            const affiliateSettings = await AffiliateSetting.findOne({});

            const affiliateUser = await AffiliateUser.findOne({
                user: req.user._id,
                isActive: true,
            });

            if (!affiliateUser) {
                return sendErrorResponse(res, 400, "Affiliate user not found");
            }

            if (points > affiliateUser.totalPoints) {
                return sendErrorResponse(res, 400, "Affiliate have not enough points");
            }

            let amount = (1 / affiliateSettings.pointValue) * points;

            if (amount < 50) {
                return sendErrorResponse(
                    res,
                    400,
                    "Affiliate amount value should be geater than 50 AED"
                );
            }

            const totalAmount = await convertCurrencyUSD(amount, currency);

            const feeDeduction = Number(affiliateSettings.deductionFee / 100) * totalAmount;

            const finalAmount = Number(totalAmount) - Number(feeDeduction);

            const newRedeemRequest = new AffiliateRedeem({
                user: req.user._id,
                points,
                financialData: financialUserData._id,
                amount: finalAmount,
                status: "initiated",
                feeDeduction: feeDeduction,
                currency,
            });

            await newRedeemRequest.save();

            res.status(200).json({
                redeemRequest: newRedeemRequest._id,
                amount: finalAmount,
                currency: currency,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    completeAffiliateRedeemRequest: async (req, res) => {
        try {
            const { redeemId } = req.params;

            const affiliateRedeemRequest = await AffiliateRedeem.findById(redeemId);
            if (!affiliateRedeemRequest) {
                return sendErrorResponse(res, 400, "Affiliate not found");
            }
            
            if (affiliateRedeemRequest?.status !== "initiated") {
                return sendErrorResponse(res, 400, "Affiliate request already  progressed");
            }

            affiliateRedeemRequest.status = "pending";

            await affiliateRedeemRequest.save();

            res.status(200).json({
                redeemRequest: affiliateRedeemRequest._id,
                message: "currently request has been send  wait for the confirmation from admin ",
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
