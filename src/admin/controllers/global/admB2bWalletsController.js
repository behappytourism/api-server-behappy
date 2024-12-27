const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const {
    Reseller,
    B2BTransaction,
    B2BWallet,
    B2BWalletDeposit,
    B2bWalletWithdraw,
} = require("../../../b2b/models");
const { B2BWalletWithdrawRequest } = require("../../../b2b/models");
const { deductAmountFromWallet } = require("../../../b2b/utils/wallet");
const {
    admB2bWalletDepositSchema,
} = require("../../validations/global/admB2bWalletDeposit.schema");
const { CompanyBankInfo } = require("../../../models/global");
const {
    rjectB2bWalletWithdrawRequestSchema,
    approveB2bWalletWithdrawRequestSchema,
} = require("../../validations/global/b2bWalletWithdrawRequest.schema");
const { Types } = require("mongoose");

module.exports = {
    depositMoneyToB2bWalletAccount: async (req, res) => {
        try {
            const { resellerId, amount, referenceNo, paymentProcessor, companyBankId } = req.body;

            const { error } = admB2bWalletDepositSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }
            const reseller = await Reseller.findOne({
                _id: resellerId,
                $or: [{ status: "ok" }, { status: "disabled" }],
            });
            if (!reseller) {
                return sendErrorResponse(res, 400, "reseller not found or not active");
            }

            if (Number(amount) <= 0) {
                return sendErrorResponse(res, 400, "amount should be greater than zero");
            }

            if (paymentProcessor === "bank") {
                if (!isValidObjectId(companyBankId)) {
                    return sendErrorResponse(res, 400, "invalid company bank id");
                }
                const bankInfo = await CompanyBankInfo.findById(companyBankId).lean();
                if (!bankInfo) {
                    return sendErrorResponse(res, 404, "company bank not found");
                }
            }
            console.log("call reached 1");

            const walletDeposit = new B2BWalletDeposit({
                reseller: resellerId,
                depositAmount: amount,
                creditAmount: amount,
                fee: 0,
                status: "pending",
                isDepositedByAdmin: true,
                adminDepositor: req.admin?._id,
                paymentProcessor,
                referenceNo: paymentProcessor === "bank" ? referenceNo : null,
                companyBankId: paymentProcessor === "bank" ? companyBankId : null,
            });
            await walletDeposit.save();
            console.log("call reached 2");

            let b2bWallet = await B2BWallet.findOne({ reseller: resellerId });
            if (!b2bWallet) {
                b2bWallet = new B2BWallet({
                    balance: 0,
                    creditAmount: 0,
                    creditUsed: 0,
                    reseller: resellerId,
                });
                console.log("call reached 3");

                b2bWallet.balance += Number(amount);
                await b2bWallet.save();
                console.log("call reached 4");
            } else {
                if (b2bWallet.creditUsed && b2bWallet.creditUsed > 0) {
                    let balance = Number(b2bWallet.creditUsed) - Number(amount);

                    if (balance <= 0) {
                        b2bWallet.creditUsed = 0;
                        b2bWallet.balance += Number(-balance);
                        await b2bWallet.save();
                    } else {
                        b2bWallet.creditUsed = Number(balance);
                        await b2bWallet.save();
                    }
                } else {
                    b2bWallet.balance += Number(amount);
                    await b2bWallet.save();
                }
            }
            console.log("call reached 5");

            walletDeposit.status = "completed";
            await walletDeposit.save();

            console.log("call reached 6");

            await B2BTransaction.create({
                reseller: resellerId,
                paymentProcessor: "wallet",
                product: "wallet",
                processId: walletDeposit?._id,
                description: `An amount of ${amount} AED deposited by ${req.admin?.name}`,
                debitAmount: 0,
                creditAmount: amount,
                directAmount: 0,
                closingBalance: b2bWallet.balance,
                dueAmount: b2bWallet.creditUsed,
                remark: "Wallet deposit",
                dateTime: new Date(),
            });
            console.log("call reached 7");

            res.status(200).json({
                message: "balance successfully added",
                balance: b2bWallet.balance,
                creditAmount: b2bWallet.creditAmount,
                creditUsed: b2bWallet.creditUsed,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    removeMoneyFromB2bWallet: async (req, res) => {
        try {
            const { resellerId, amount, note } = req.body;

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }
            const reseller = await Reseller.findOne({
                _id: resellerId,
                $or: [{ status: "ok" }, { status: "disabled" }],
            });
            if (!reseller) {
                return sendErrorResponse(res, 404, "reseller not found or not active");
            }

            if (Number(amount) <= 0) {
                return sendErrorResponse(res, 400, "amount should be greater than zero");
            }

            let b2bWallet = await B2BWallet.findOne({ reseller: resellerId });
            if (!b2bWallet) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry, there is no wallet associated with this b2b account"
                );
            }
            if (b2bWallet.balance < Number(amount)) {
                return sendErrorResponse(
                    res,
                    400,
                    "amount should be less than or equal to current balance"
                );
            }

            const b2bWalletWithdraw = new B2bWalletWithdraw({
                resellerId: resellerId,
                withdrawAmount: Number(amount),
                fee: 0,
                status: "pending",
                withdrawnAdmin: req.admin?._id,
                paymentProcessor: "direct",
                note: "",
            });
            await b2bWalletWithdraw.save();

            b2bWallet.balance -= Number(amount);
            await b2bWallet.save();

            b2bWalletWithdraw.status = "completed";
            await b2bWalletWithdraw.save();

            await B2BTransaction.create({
                reseller: resellerId,
                paymentProcessor: "wallet",
                product: "wallet",
                processId: "0",
                description: note,
                debitAmount: amount,
                creditAmount: 0,
                directAmount: 0,
                closingBalance: b2bWallet.balance,
                dueAmount: b2bWallet.creditUsed,
                remark: "Wallet deduction",
                dateTime: new Date(),
            });

            res.status(200).json({
                message: "balance successfully removed",
                balance: b2bWallet.balance,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    onUpsertWalletCredit: async (req, res) => {
        try {
            const { resellerId, creditAmount } = req.body;

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }

            const reseller = await Reseller.findOne({
                _id: resellerId,
                $or: [{ status: "ok" }, { status: "disabled" }],
            });

            if (!reseller) {
                return sendErrorResponse(res, 400, "reseller not found or not active");
            }

            let wallet = await B2BWallet.findOne({ reseller: resellerId });

            if (!wallet) {
                wallet = new B2BWallet({
                    balance: 0,
                    creditAmount: 0,
                    reseller: resellerId,
                });
            }

            wallet.creditAmount = Number(creditAmount);
            await wallet.save();

            res.status(200).json({
                message: "wallet credit added successfully",
                balance: wallet.balance,
                creditAmount: wallet.creditAmount,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addUsedCreditToWallet: async (req, res) => {
        try {
            const { resellerId, amount, note } = req.body;

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }
            const reseller = await Reseller.findOne({
                _id: resellerId,
                $or: [{ status: "ok" }, { status: "disabled" }],
            });
            if (!reseller) {
                return sendErrorResponse(res, 404, "reseller not found or not active");
            }

            let b2bWallet = await B2BWallet.findOne({ reseller: resellerId });
            if (!b2bWallet) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry, there is no wallet associated with this b2b account"
                );
            }

            await deductAmountFromWallet(b2bWallet, amount);

            await B2BTransaction.create({
                reseller: resellerId,
                paymentProcessor: "wallet",
                product: "wallet",
                processId: "0",
                description: note,
                debitAmount: amount,
                creditAmount: 0,
                directAmount: 0,
                closingBalance: b2bWallet.balance,
                dueAmount: b2bWallet.creditUsed,
                remark: "Wallet deduction",
                dateTime: new Date(),
            });

            res.status(200).json({
                message: "balance successfully updated",
                balance: b2bWallet.balance,
                creditUsed: b2bWallet.creditUsed,
                creditAmount: b2bWallet.creditAmount,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllWalletDepositRequests: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                referenceNo,
                agentCode,
                dateFrom,
                dateTo,
                status,
            } = req.query;

            let filters = {};

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

            if (agentCode && agentCode !== "") {
                const reseller = await Reseller.findOne({ agentCode })
                    .select("_id agentCode")
                    .lean();
                if (reseller) {
                    filters.resellerId = reseller?._id;
                }
            }

            const walletWithdrawRequests = await B2BWalletWithdrawRequest.find(filters)
                .populate("resellerId", "companyName agentCode")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalWithdrawRequests = await B2BWalletWithdrawRequest.find(filters).count();

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

    approveWalletWithdrawalRequest: async (req, res) => {
        try {
            const { id } = req.params;
            const { paymentReferenceNo, companyBankId } = req.body;

            const { error } = approveB2bWalletWithdrawRequestSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid withdrawal request id");
            }
            const b2bWalletWithdrawRequest = await B2BWalletWithdrawRequest.findById(id);
            if (!b2bWalletWithdrawRequest) {
                return sendErrorResponse(res, 400, "Wallet Withdraw History not found");
            }
            if (b2bWalletWithdrawRequest.status !== "pending") {
                return sendErrorResponse(
                    res,
                    400,
                    "this withdrawal request can't cancel at this moment"
                );
            }

            if (!isValidObjectId(companyBankId)) {
                return sendErrorResponse(res, 400, "invalid company bank id");
            }
            const companyBank = await CompanyBankInfo.findById(companyBankId).lean();
            if (!companyBank) {
                return sendErrorResponse(res, 400, "company bank not found");
            }

            const walletWithdraw = new B2bWalletWithdraw({
                resellerId: b2bWalletWithdrawRequest?.resellerId,
                withdrawAmount: b2bWalletWithdrawRequest?.amount,
                fee: 0,
                status: "completed",
                withdrawnAdmin: req.admin?._id,
                paymentProcessor: "bank",
                referenceNo: paymentReferenceNo,
                companyBankId,
                note: "",
                bankDetailsId: b2bWalletWithdrawRequest?.bankDetailsId,
                b2bBankDetails: b2bWalletWithdrawRequest?.b2bBankDetails,
            });
            await walletWithdraw.save();

            b2bWalletWithdrawRequest.status = "confirmed";
            b2bWalletWithdrawRequest.withdrawalId = walletWithdraw?._id;
            await b2bWalletWithdrawRequest.save();

            res.status(200).json({ success: "wallet withdrawal request successfully confirmed" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    rejectWalletWithdrawalRequest: async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const { error } = rjectB2bWalletWithdrawRequestSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid  id");
            }
            const b2bWalletWithdrawRequest = await B2BWalletWithdrawRequest.findById(id);
            if (!b2bWalletWithdrawRequest) {
                return sendErrorResponse(res, 400, "Wallet Withdraw History not found");
            }

            if (b2bWalletWithdrawRequest.status !== "pending") {
                return sendErrorResponse(
                    res,
                    400,
                    "this withdrawal request can't cancel at this moment"
                );
            }

            b2bWalletWithdrawRequest.cancellationReason = reason;
            b2bWalletWithdrawRequest.status = "cancelled";
            await b2bWalletWithdrawRequest.save();

            const resellerId = b2bWalletWithdrawRequest.resellerId;
            const amount = b2bWalletWithdrawRequest.amount;

            if (amount > 0) {
                let b2bWallet = await B2BWallet.findOne({
                    reseller: resellerId,
                });
                if (!b2bWallet) {
                    b2bWallet = new B2BWallet({
                        balance: 0,
                        creditAmount: 0,
                        creditUsed: 0,
                        reseller: resellerId,
                    });

                    b2bWallet.balance += amount;
                    await b2bWallet.save();
                } else {
                    if (b2bWallet.creditUsed && b2bWallet.creditUsed > 0) {
                        let balance = Number(b2bWallet.creditUsed) - amount;

                        if (balance <= 0) {
                            b2bWallet.creditUsed = 0;
                            b2bWallet.balance += Number(-balance);
                            await b2bWallet.save();
                        } else {
                            b2bWallet.creditUsed = Number(balance);
                            await b2bWallet.save();
                        }
                    } else {
                        b2bWallet.balance += amount;
                        await b2bWallet.save();
                    }
                }

                await B2BTransaction.create({
                    reseller: resellerId,
                    paymentProcessor: "wallet",
                    product: "wallet",
                    processId: b2bWalletWithdrawRequest?._id,
                    description: `Amount returned`,
                    debitAmount: 0,
                    creditAmount: amount,
                    directAmount: 0,
                    closingBalance: b2bWallet.balance,
                    dueAmount: b2bWallet.creditUsed,
                    remark: "Amount returned",
                    dateTime: new Date(),
                });
            }

            res.status(200).json({ message: "Withdraw Request Was Not Successful" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllWalletWithdrawals: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                dateFrom,
                dateTo,
                status,
                paymentProcessor,
                bankId,
                referenceNo,
                agentCode,
            } = req.query;

            const filters = {};

            if (referenceNo) {
                if (!isNaN(referenceNo)) {
                    filters.$or = [{ b2bWalletWithdrawRefNo: referenceNo }, { referenceNo }];
                } else {
                    filters.referenceNo = referenceNo;
                }
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

            if (status && status !== "") {
                filters.status = status;
            }

            if (paymentProcessor && paymentProcessor !== "") {
                filters.paymentProcessor = paymentProcessor;
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

            const walletWithdrawals = await B2bWalletWithdraw.find(filters)
                .sort({ createdAt: -1 })
                .populate("resellerId", "companyName agentCode")
                .populate("withdrawnAdmin", "name _id")
                .populate("companyBankId", "bankName")
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalWithdrawals = await B2bWalletWithdraw.find(filters).count();

            res.status(200).json({
                totalWithdrawals,
                skip: Number(skip),
                limit: Number(limit),
                walletWithdrawals,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllWalletDeposits: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                dateFrom,
                dateTo,
                status,
                paymentProcessor,
                bankId,
                referenceNo,
                agentCode,
            } = req.query;

            const filters = {};

            if (referenceNo) {
                if (!isNaN(referenceNo)) {
                    filters.$or = [{ b2bWalletDepositRefNumber: referenceNo }, { referenceNo }];
                } else {
                    filters.referenceNo = referenceNo;
                }
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

            if (status && status !== "") {
                filters.status = status;
            }

            if (paymentProcessor && paymentProcessor !== "") {
                filters.paymentProcessor = paymentProcessor;
            }

            if (bankId && bankId !== "") {
                filters.companyBankId = bankId;
            }

            if (agentCode && agentCode !== "") {
                const reseller = await Reseller.findOne({ agentCode })
                    .select("_id agentCode")
                    .lean();
                if (reseller) {
                    filters.reseller = reseller?._id;
                }
            }

            const walletDeposits = await B2BWalletDeposit.find(filters)
                .sort({ createdAt: -1 })
                .populate("reseller", "companyName agentCode")
                .populate("adminDepositor", "name _id")
                .populate("companyBankId", "bankName")
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalDeposits = await B2BWalletDeposit.find(filters).count();

            res.status(200).json({
                totalDeposits,
                skip: Number(skip),
                limit: Number(limit),
                walletDeposits,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getB2bWalletsStatistics: async (req, res) => {
        try {
            const walletBalance = await B2BWallet.aggregate([
                { $match: {} },
                {
                    $group: {
                        _id: null,
                        totalBalance: { $sum: "$balance" },
                        totalDue: { $sum: "$creditUsed" },
                        totalCredit: { $sum: "$creditAmount" },
                    },
                },
            ]);
            const walletDeposits = await B2BWalletDeposit.aggregate([
                { $match: { status: "completed" } },
                {
                    $group: {
                        _id: null,
                        deposited: { $sum: "$depositAmount" },
                        credited: { $sum: "$creditAmount" },
                        fee: { $sum: "$fee" },
                    },
                },
            ]);

            res.status(200).json({
                totalWalletBalance: walletBalance[0]?.totalBalance || 0,
                totalDue: walletBalance[0]?.totalDue || 0,
                totalWalletCredit: walletBalance[0]?.totalCredit || 0,
                totalDepositedAmount: walletDeposits[0]?.deposited || 0,
                totalCreditedAmount: walletDeposits[0]?.credited || 0,
                totalFee: walletDeposits[0]?.fee || 0,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleReseller: async (req, res) => {
        try {
            const { resellerId } = req.params;
            const walletBalance = await B2BWallet.findOne({ reseller: resellerId });

            res.status(200).json(walletBalance);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
