const { isValidObjectId } = require("mongoose");
const {
    B2bWalletDepositRequest,
    B2BWalletDeposit,
    B2BWallet,
    B2BTransaction,
    Reseller,
} = require("../../../b2b/models");
const { addMoneyToB2bWallet } = require("../../../b2b/utils/wallet");
const { sendErrorResponse } = require("../../../helpers");

module.exports = {
    getAllWalletDepositRequests: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                status,
                dateFrom,
                dateTo,
                bankId,
                referenceNo,
                agentCode,
            } = req.query;

            const filters = {};

            if (referenceNo) {
                filters.referenceNumber = referenceNo;
            }

            if (status) {
                filters.status = status;
            }

            if (dateFrom && dateTo) {
                filters.$and = [
                    { createdAt: { $gte: new Date(dateFrom) } },
                    { createdAt: { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom) {
                filters["createdAt"] = { $gte: new Date(dateFrom) };
            } else if (dateTo) {
                filters["createdAt"] = { $lte: new Date(dateTo) };
            }

            if (bankId && bankId !== "") {
                filters.companyBankId = bankId;
            }

            if (agentCode && agentCode !== "") {
                const reseller = await Reseller.findOne({ agentCode })
                    .select("_id agentCode")
                    .lean();
                if (reseller) {
                    filters.resellerId = reseller?._id;
                }
            }

            const walletDepositRequests = await B2bWalletDepositRequest.find(filters)
                .populate("companyBankId", "bankName")
                .populate("resellerId", "companyName agentCode")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalWalletDepositRequests = await B2bWalletDepositRequest.find(filters).count();

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

    approveWalletDepositRequest: async (req, res) => {
        try {
            const { requestId } = req.params;

            if (!isValidObjectId(requestId)) {
                return sendErrorResponse(res, 400, "invalid deposit request id");
            }
            const walletDepositRequest = await B2bWalletDepositRequest.findById(requestId);
            if (!walletDepositRequest) {
                return sendErrorResponse(res, 400, "wallet deposit request not found");
            }

            if (walletDepositRequest.status !== "pending") {
                return sendErrorResponse(
                    res,
                    400,
                    "wallet deposit request already confirmed or cancelled"
                );
            }

            walletDepositRequest.confirmedBy = req.admin?._id;
            walletDepositRequest.status = "confirmed";
            await walletDepositRequest.save();

            const newWalletDeposit = new B2BWalletDeposit({
                reseller: walletDepositRequest.resellerId,
                depositAmount: walletDepositRequest.amount,
                creditAmount: walletDepositRequest.amount,
                fee: 0,
                status: "pending",
                isDepositedByAdmin: false,
                adminDepositor: req.admin?._id,
                paymentProcessor: "bank",
                referenceNo: walletDepositRequest.referenceNumber,
                note: "",
                companyBankId: walletDepositRequest?.companyBankId,
            });
            await newWalletDeposit.save();

            let wallet = await B2BWallet.findOne({ reseller: walletDepositRequest?.resellerId });
            if (!wallet) {
                wallet = new B2BWallet({
                    balance: 0,
                    creditAmount: 0,
                    creditUsed: 0,
                    reseller: walletDepositRequest?.resellerId,
                });
            }

            try {
                await addMoneyToB2bWallet(wallet, walletDepositRequest.amount);
            } catch (err) {
                newWalletDeposit.status = "failed";
                await newWalletDeposit.save();

                return sendErrorResponse(res, 400, "something went wrong on wallet depoit");
            }

            newWalletDeposit.status = "completed";
            await newWalletDeposit.save();

            await B2BTransaction.create({
                reseller: walletDepositRequest?.resellerId,
                paymentProcessor: "wallet",
                product: "wallet",
                processId: requestId,
                description: "Wallet deposit",
                debitAmount: 0,
                creditAmount: walletDepositRequest.amount,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "Wallet deposit",
                dateTime: new Date(),
            });

            res.status(200).json({
                message: "wallet deposit request successfully confirmed",
                requestId,
                status: walletDepositRequest.status,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    cancelWalletDepositRequest: async (req, res) => {
        try {
            const { requestId } = req.params;

            if (!isValidObjectId(requestId)) {
                return sendErrorResponse(res, 400, "invalid deposit request id");
            }
            const walletDepositRequest = await B2bWalletDepositRequest.findById(requestId);
            if (!walletDepositRequest) {
                return sendErrorResponse(res, 400, "wallet deposit request not found");
            }

            if (walletDepositRequest.status !== "pending") {
                return sendErrorResponse(
                    res,
                    400,
                    "wallet deposit request already confirmed or cancelled"
                );
            }

            walletDepositRequest.status = "cancelled";
            await walletDepositRequest.save();

            res.status(200).json({
                message: "wallet deposit request successfully cancelled",
                requestId,
                status: walletDepositRequest.status,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
