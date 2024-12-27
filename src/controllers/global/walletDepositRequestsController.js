const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { CompanyBankInfo } = require("../../../models/global");
const { B2bWalletDepositRequest } = require("../../models");
const {
    b2bWalletDepositRequestSchema,
} = require("../../validations/global/b2bWalletDepositRequestSchema");

module.exports = {
    addNewWalletDepositRequest: async (req, res) => {
        try {
            const { companyBankId } = req.body;

            const { error } = b2bWalletDepositRequestSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(companyBankId)) {
                return sendErrorResponse(res, 400, "invalid company bank account id");
            }
            const bankAccount = await CompanyBankInfo.findById(companyBankId).lean();
            if (!bankAccount) {
                return sendErrorResponse(res, 400, "company bank account not found");
            }

            let receipt;
            if (req.file?.path) {
                receipt = "/" + req.file.path.replace(/\\/g, "/");
            }

            const newWalletDepositRequest = new B2bWalletDepositRequest({
                ...req.body,
                resellerId: req.reseller?._id,
                status: "pending",
                receipt,
            });
            await newWalletDepositRequest.save();

            res.status(200).json(newWalletDepositRequest);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllWalletDepositRequests: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const walletDepositRequests = await B2bWalletDepositRequest.find({
                resellerId: req.reseller?._id,
            })
                .populate("companyBankId", "bankName")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalWalletDepositRequests = await B2bWalletDepositRequest.find({
                resellerId: req.reseller?._id,
            }).count();

            res.status(200).json({
                totalWalletDepositRequests,
                skip: Number(skip),
                limit: Number(limit),
                walletDepositRequests,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
