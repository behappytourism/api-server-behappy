const { isValidObjectId } = require("mongoose");
const { sendErrorResponse } = require("../../helpers");
const {
    B2CWallet,
    Country,
    B2CBankDetails,
    B2CWalletWithdrawRequest,
    B2CTransaction,
} = require("../../models");
const {
    b2cWalletWithdrawalRequestSchema,
} = require("../../validations/global/b2cWalletWithdrawalRequest.schema");

module.exports = {
    walletWithdrawalRequestInitiate: async (req, res) => {
        try {
            const {
                isNewBankAccount,
                bankDeatilId,
                isoCode,
                bankName,
                branchName,
                accountHolderName,
                accountNumber,
                ifscCode,
                ibanCode,
                amount,
            } = req.body;

            const { error } = b2cWalletWithdrawalRequestSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let wallet = await B2CWallet.findOne({
                user: req.user._id,
            });
            if (!wallet) {
                return sendErrorResponse(res, 400, "wallet not found");
            }

            if (wallet.balance < Number(amount)) {
                return sendErrorResponse(res, 400, "amount should be less than available balance");
            }

            let bankDetails;
            if (isNewBankAccount === true) {
                let country = await Country.findOne({
                    isocode: isoCode?.toUpperCase(),
                    isDeleted: false,
                }).lean();
                if (!country) {
                    return sendErrorResponse(res, 400, "Country not found");
                }

                if (isoCode === "IN" && ifscCode == "") {
                    return sendErrorResponse(res, 400, "IFSC Code is required");
                }

                bankDetails = new B2CBankDetails({
                    countryId: country._id,
                    bankCountry: isoCode,
                    bankName,
                    branchName,
                    accountHolderName,
                    accountNumber,
                    ifscCode,
                    ibanCode,
                    user: req.user?._id,
                });
                await bankDetails.save();
            } else {
                if (!isValidObjectId(bankDeatilId)) {
                    return sendErrorResponse(res, 400, "Invalid withdraw request id");
                }
                bankDetails = await B2CBankDetails.findOne({
                    _id: bankDeatilId,
                    user: req.user?._id,
                });
                if (!bankDetails) {
                    return sendErrorResponse(res, 400, "bank details not found");
                }
            }

            const otp = "12345";
            const walletWithdrawRequest = new B2CWalletWithdrawRequest({
                user: req.user._id,
                bankDetailsId: bankDetails._id,
                amount,
                status: "initiated",
                otp,
                b2bBankDetails: {
                    isoCode: isoCode,
                    bankName: bankDetails.bankName,
                    accountHolderName: bankDetails.accountHolderName,
                    accountNumber: bankDetails?.accountNumber,
                    ifscCode: bankDetails?.ifscCode,
                    ibanCode: bankDetails?.ibanCode,
                    branchName: bankDetails?.branchName,
                },
            });
            await walletWithdrawRequest.save();

            res.status(200).json({
                message: "Withdrawal request initiated successfully",
                withdrawRequestId: walletWithdrawRequest._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    walletWithdrawalReqauestComplete: async (req, res) => {
        try {
            const { id } = req.params;
            const { otp } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid Withdraw Request Id");
            }
            const withdrawRequest = await B2CWalletWithdrawRequest.findOne({
                _id: id,
                user: req.user?._id,
            });
            if (!withdrawRequest || withdrawRequest.status !== "initiated") {
                return sendErrorResponse(res, 400, "Invalid withdrawRequest details");
            }

            if (!withdrawRequest.otp || withdrawRequest.otp !== Number(otp)) {
                return sendErrorResponse(res, 400, "incorrect otp!");
            }

            let wallet = await B2CWallet.findOne({
                user: req.user._id,
            });
            if (!wallet) {
                return sendErrorResponse(res, 400, "wallet not found");
            }
            if (wallet.balance < Number(withdrawRequest.amount)) {
                return sendErrorResponse(res, 400, "amount should be less than available balance");
            }

            if (Number(withdrawRequest.amount) > 0) {
                wallet.balance -= Number(withdrawRequest.amount);
                await wallet.save();

                await B2CTransaction.create({
                    user: req.user?._id,
                    paymentProcessor: "wallet",
                    product: "wallet",
                    processId: withdrawRequest?._id,
                    description: `Wallet withdrawal`,
                    debitAmount: withdrawRequest.amount,
                    creditAmount: 0,
                    directAmount: 0,
                    closingBalance: wallet.balance,
                    dueAmount: wallet.creditUsed,
                    remark: "Wallet withdrawal",
                    dateTime: new Date(),
                });
            }

            withdrawRequest.status = "pending";
            await withdrawRequest.save();

            res.status(200).json({
                success: "Wallet withdraw request successfully submitted",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllWalletWithdrawRequests: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const walletWithdrawRequests = await B2CWalletWithdrawRequest.find({
                resellerId: req.reseller?._id,
            })
                .select(
                    "amount status remark cancellationReason b2bWalletWithdrawRequestRefNo b2bBankDetails remark createdAt"
                )
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalWithdrawRequests = await B2CWalletWithdrawRequest.find({
                user: req.user?._id,
            }).count();

            res.status(200).json({
                totalWithdrawRequests,
                skip: Number(skip),
                limit: Number(limit),
                walletWithdrawRequests,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
