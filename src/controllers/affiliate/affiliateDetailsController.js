const { isValidObjectId, Types } = require("mongoose");

const { sendErrorResponse } = require("../../helpers");
const {
    Attraction,
    AttractionReview,
    User,
    AffiliateUser,
    AffiliateClickHistory,
    AffiliatePointHistory,
    FinancialUserData,
    AffiliateRedeem,
} = require("../../models");
const AffiliateSetting = require("../../models/affiliate/affiliateSettings.model");
const { userFinancialDataSchema } = require("../../validations/user/userFinancial.schema");

module.exports = {
    addAffiliateSettings: async (req, res) => {
        try {
            const { isTermsAndConditions } = req.body;

            if (isTermsAndConditions !== true) {
                return sendErrorResponse(res, 400, "terms and conditions not checked ");
            }

            let user = await User.findOne({ email: req.user.email });

            if (!user) {
                return sendErrorResponse(res, 400, "user not found");
            }

            let affiliateUser = await AffiliateUser.findOne({ user: req.user._id });
            if (affiliateUser) {
                return sendErrorResponse(res, 400, "user is already affiliate");
            }

            const newAffiliateUser = new AffiliateUser({
                user: req.user._id,
                isActive: true,
            });

            await newAffiliateUser.save();

            res.status(200).json(newAffiliateUser);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAffiliationUserDetails: async (req, res) => {
        try {
            let affiliationUser = await AffiliateUser.findOne({
                user: req.user._id,
                isActive: true,
            }).lean();

            if (!affiliationUser) {
                return sendErrorResponse(
                    res,
                    400,
                    "user affiliation not found or admin has disabled it "
                );
            }

            // const attractions = await AffiliateClickHistory.aggregate([
            //     {
            //         $lookup: {
            //             from: "attractions",
            //             localField: "attraction",
            //             foreignField: "_id",
            //             as: "attractionInfo",
            //         },
            //     },
            //     {
            //         $unwind: "$attractionInfo", // Unwind the array created by the lookup
            //     },
            //     {
            //         $group: {
            //             _id: "$attractionInfo.title", // Group by attraction title
            //             totalClicks: { $sum: 1 },
            //         },
            //     },
            // ]);

            const totalRedeemRequest = await AffiliateRedeem.find({ user: req.user._id }).count();

            res.status(200).json({
                affiliationUser: { ...affiliationUser, totalRedeemRequest },
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAffilateAttractions: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;
            const attractions = await Attraction.aggregate([
                {
                    $match: {
                        isDeleted: false,
                    },
                },
                {
                    $lookup: {
                        from: "affiliateclickhistories",
                        localField: "_id",
                        foreignField: "attraction",
                        as: "attractionInfo",
                    },
                },
                {
                    $lookup: {
                        from: "affiliateclickhistories",
                        let: { attraction: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$attraction", "$$attraction"] },
                                            { $eq: ["$user", Types.ObjectId(req.user._id)] },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "click",
                    },
                },
                {
                    $addFields: {
                        clickCount: { $size: "$click" },
                    },
                },
                {
                    $project: {
                        title: 1,
                        slug: 1,
                        clickCount: 1,
                    },
                },
                {
                    $sort: {
                        createdAt: -1,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalAttractions: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalAttractions: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                attractions: attractions[0].data,
                totalResellers: attractions[0].totalAttractions,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAffiliateTermsAndPolicy: async (req, res) => {
        try {
            const AffiliateTermsAndPolicy = await AffiliateSetting.findOne({}).select(
                "termsAndConditions policy"
            );

            if (!AffiliateTermsAndPolicy) {
                return sendErrorResponse(
                    res,
                    400,
                    "affiliation not found or admin has disabled it "
                );
            }

            let affiliationUser = await AffiliateUser.findOne({
                user: req.user._id,
            });

            if (affiliationUser?.isActive) {
                return sendErrorResponse(res, 400, "affiliation already added  ");
            }

            res.status(200).json(AffiliateTermsAndPolicy);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteAffiliate: async (req, res) => {
        try {
            let affiliateUser = await AffiliateUser.findOne({ user: req.user._id });
            if (!affiliateUser) {
                return sendErrorResponse(res, 400, "user is not an affiliate");
            }
            affiliateUser.isActive = false;

            await affiliateUser.save();
            res.status(200).json({ messgae: "affiliate user is changed to inactive" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAffiliatePointHistory: async (req, res) => {
        try {
            const { limit = 10, skip = 0, status } = req.query;
            const affiliateUser = await AffiliateUser.find({ user: req.user._id });

            if (!affiliateUser) {
                return sendErrorResponse(res, 400, "user is not an affiliate");
            }

            const filters = { isDeleted: false };

            filters.user = req.user._id;

            const pointHostory = await AffiliatePointHistory.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalPointHistory = await AffiliatePointHistory.findOne(filters).count();

            res.status(200).json({
                pointHostory,
                totalPointHistory,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addFinancialData: async (req, res) => {
        try {
            const {
                type,
                bankName,
                accountHolderName,
                countryCode,
                ifsc,
                iban,
                accountNumber,
                network,
                address,
            } = req.body;

            const { _, error } = userFinancialDataSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const newFinancialData = new FinancialUserData({
                user: req.user._id,
                type,
                bankName,
                accountHolderName,
                ifsc,
                iban,
                accountNumber,
                network,
                address,
                countryCode,
            });

            await newFinancialData.save();

            res.status(200).json({ message: "user data saved successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateFinancialData: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                type,
                bankName,
                accountHolderName,
                countryCode,
                ifsc,
                iban,
                accountNumber,
                network,
                address,
            } = req.body;

            const { _, error } = userFinancialDataSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const userFinancialData = await FinancialUserData.findOneAndUpdate(
                { _id: id },
                {
                    type,
                    bankName,
                    accountHolderName,
                    countryCode,
                    ifsc,
                    iban,
                    accountNumber,
                    network,
                    address,
                },
                {
                    upsert: true,
                    new: true,
                }
            );

            res.status(200).json({ message: "user data updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleUserFinacialData: async (req, res) => {
        try {
            const userFinancialData = await FinancialUserData.find({ user: req.user._id });

            res.status(200).json(userFinancialData || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
