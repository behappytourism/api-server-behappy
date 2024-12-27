const { isValidObjectId, Types } = require("mongoose");
const xl = require("excel4node");

const { sendErrorResponse } = require("../../../helpers");
const {
    B2CTransaction,
    AccountDetail,
    TransactionCategory,
    CompanyTransaction,
} = require("../../../models");
const {
    getB2bTransactions,
    generateB2bTransactionsSheet,
} = require("../../../b2b/helpers/b2bTransactionsHelpers");
const { formatDate } = require("../../../utils");
const { transactionSchema } = require("../../validations/global/transaction.schema");
const { B2BTransaction, B2BWallet } = require("../../../b2b/models");
const { accountDetailsSchema } = require("../../validations/global/addAccountDetails");
const {
    getCompanyTransactions,
    generateCompanyTransactionsSheet,
} = require("../../../b2b/helpers/companyTransactionHelper");
const { deductAmountFromWallet, checkWalletBalance } = require("../../../b2b/utils/wallet");

module.exports = {
    getAllB2cTransactions: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                transactionNo,
                transactionType,
                paymentProcessor,
                status,
                dateFrom,
                dateTo,
                userId,
            } = req.query;

            const filters1 = {};
            const filters2 = {};

            if (userId && userId !== "") {
                filters1.user = Types.ObjectId(userId);
            }

            if (transactionNo && transactionNo !== "") {
                filters1.transactionNo = Number(transactionNo);
            }

            if (transactionType && transactionType !== "") {
                filters1.transactionType = transactionType;
            }

            if (paymentProcessor && paymentProcessor !== "") {
                filters1.paymentProcessor = paymentProcessor;
            }

            if (status && status !== "") {
                filters1.status = status;
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filters1.$and = [
                    { createdAt: { $gte: new Date(dateFrom) } },
                    { createdAt: { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filters1["createdAt"] = { $gte: new Date(dateFrom) };
            } else if (dateTo && dateTo !== "") {
                filters1["createdAt"] = { $lte: new Date(dateTo) };
            }

            const transactions = await B2CTransaction.aggregate([
                { $match: filters1 },
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "user",
                    },
                },
                {
                    $addFields: {
                        user: { $arrayElemAt: ["$user", 0] },
                    },
                },
                {
                    $match: filters2,
                },
                {
                    $project: {
                        user: {
                            name: 1,
                            email: 1,
                        },
                        transactionType: 1,
                        paymentProcessor: 1,
                        amount: 1,
                        status: 1,
                        createdAt: 1,
                        referenceNo: 1,
                        b2cTransactionNo: 1,
                    },
                },
                {
                    $sort: { createdAt: -1 },
                },
                {
                    $group: {
                        _id: null,
                        totalTransactions: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalTransactions: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                result: transactions[0],
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllB2cTransactionsSheet: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                transactionNo,
                transactionType,
                paymentProcessor,
                status,
                dateFrom,
                dateTo,
            } = req.query;

            const filters1 = {};
            const filters2 = {};

            if (transactionNo && transactionNo !== "") {
                filters1.transactionNo = Number(transactionNo);
            }

            if (transactionType && transactionType !== "") {
                filters1.transactionType = transactionType;
            }

            if (paymentProcessor && paymentProcessor !== "") {
                filters1.paymentProcessor = paymentProcessor;
            }

            if (status && status !== "") {
                filters1.status = status;
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filters1.$and = [
                    { createdAt: { $gte: new Date(dateFrom) } },
                    { createdAt: { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filters1["createdAt"] = { $gte: new Date(dateFrom) };
            } else if (dateTo && dateTo !== "") {
                filters1["createdAt"] = { $lte: new Date(dateTo) };
            }

            const transactions = await B2CTransaction.aggregate([
                { $match: filters1 },
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "user",
                    },
                },
                {
                    $addFields: {
                        user: { $arrayElemAt: ["$user", 0] },
                    },
                },
                {
                    $match: filters2,
                },
                {
                    $project: {
                        user: {
                            name: 1,
                            email: 1,
                        },
                        transactionType: 1,
                        paymentProcessor: 1,
                        amount: 1,
                        status: 1,
                        createdAt: 1,
                        referenceNo: 1,
                        b2cTransactionNo: 1,
                    },
                },
                {
                    $sort: { createdAt: -1 },
                },
                {
                    $skip: Number(limit) * Number(skip),
                },
                {
                    $limit: Number(limit),
                },
            ]);

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet("Orders");

            const titleStyle = wb.createStyle({
                font: {
                    bold: true,
                },
            });

            ws.cell(1, 1).string("Transaction No").style(titleStyle);
            ws.cell(1, 2).string("User Name").style(titleStyle);
            ws.cell(1, 3).string("User Email").style(titleStyle);
            ws.cell(1, 4).string("Date").style(titleStyle);
            ws.cell(1, 5).string("Transaction Type").style(titleStyle);
            ws.cell(1, 6).string("Payment Processor").style(titleStyle);
            ws.cell(1, 7).string("Amount").style(titleStyle);
            ws.cell(1, 8).string("Status").style(titleStyle);

            for (let i = 0; i < transactions?.length; i++) {
                const transaction = transactions[i];

                ws.cell(i + 2, 1).number(Number(transaction?.b2cTransactionNo) || 0);
                ws.cell(i + 2, 2).string(transaction?.user?.name || "N/A");
                ws.cell(i + 2, 3).string(transaction?.user?.email || "N/A");
                ws.cell(i + 2, 4).string(
                    transaction?.createdAt ? formatDate(transaction?.createdAt) : "N/A"
                );
                ws.cell(i + 2, 5).string(transaction?.transactionType || "N/A");
                ws.cell(i + 2, 6).string(transaction?.paymentProcessor || "N/A");
                ws.cell(i + 2, 7).number(Number(transaction?.amount) || 0);
                ws.cell(i + 2, 8).string(transaction?.status || "N/A");
            }

            wb.write(`FileName.xlsx`, res);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllB2bTransactions: async (req, res) => {
        try {
            const { result, skip, limit } = await getB2bTransactions({
                ...req.query,
            });

            res.status(200).json({ result, skip, limit });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleResellerTransactions: async (req, res) => {
        try {
            const { resellerId } = req.params;

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }

            const { result, skip, limit } = await getB2bTransactions({
                ...req.query,
                resellerId,
            });

            res.status(200).json({ result, skip, limit });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getB2bTransactionsSheet: async (req, res) => {
        try {
            await generateB2bTransactionsSheet({ ...req.query, res });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleResellerTransactionsSheet: async (req, res) => {
        try {
            const { resellerId } = req.params;

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }

            await generateB2bTransactionsSheet({
                ...req.query,
                resellerId,
                res,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllCompanyTransactions: async (req, res) => {
        try {
            const { result, skip, limit } = await getCompanyTransactions({
                ...req.query,
            });

            res.status(200).json({ result, skip, limit });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getCompanyTransactionsSheet: async (req, res) => {
        try {
            await generateCompanyTransactionsSheet({
                ...req.query,
                res,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    addNewTransaction: async (req, res) => {
        try {
            const {
                date,
                transactionFor,
                transactionType,
                paymentProcessor,
                category,
                resellerId,
                account,
                amount,
                note,
                transactionNumber,
            } = req.body;
            const { _, error } = transactionSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let newTransaction;
            if (transactionFor === "b2b") {
                const wallet = await B2BWallet.findOne({ reseller: resellerId });

                if (transactionType === "deduct" || transactionType === "withdraw") {
                    const balanceAvailable = checkWalletBalance(wallet, amount);

                    if (!balanceAvailable) {
                        return sendErrorResponse(
                            res,
                            400,
                            "Insufficient balance. please reacharge and try again"
                        );
                    }

                    newTransaction = new B2BTransaction({
                        date,
                        transactionType,
                        paymentProcessor,
                        category,
                        reseller: resellerId,
                        amount,
                        note,
                        status: "success",
                    });

                    deductAmountFromWallet(wallet, amount);
                } else {
                    newTransaction = new B2BTransaction({
                        date,
                        transactionType,
                        paymentProcessor,
                        category,
                        reseller: resellerId,
                        amount,
                        note,

                        status: "success",
                    });
                    wallet.balance += Number(amount);
                }

                await newTransaction.save();
                await wallet.save();
            } else if (transactionFor === "company") {
                const accountDetail = await AccountDetail.findById(account);
                if (!accountDetail) {
                    return sendErrorResponse(
                        res,
                        400,
                        "account not found . please add account and try again"
                    );
                }

                newTransaction = new CompanyTransaction({
                    date,
                    transactionType,
                    paymentProcessor,
                    category,
                    account,
                    amount,
                    note,
                    status: "success",
                });
                if (transactionType === "income") {
                    accountDetail.balance += Number(amount);
                } else if (transactionType === "expense") {
                    accountDetail.balance -= Number(amount);
                }

                await newTransaction.save();
                await accountDetail.save();
            } else {
                return sendErrorResponse(res, 400, "select valid transaction for ");
            }

            res.status(200).json({
                newTransaction,
                message: "new transaction created successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addCustomerCategory: async (req, res) => {
        try {
        } catch (err) {}
    },

    addAccountDetails: async (req, res) => {
        try {
            const { accountName, date, openingBalance, description, accountNumber, currency } =
                req.body;

            const { _, error } = accountDetailsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const newAccount = new AccountDetail({
                accountName,
                date,
                openingBalance,
                description,
                accountNumber,
                currency,
                balance: openingBalance,
            });

            await newAccount.save();

            res.status(200).json({
                newAccount,
                message: "new account created successfully",
            });

            // Now, you have the variables without empty strings
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    listAllAccounts: async (req, res) => {
        try {
            const accountDetails = await AccountDetail.find({ isDeleted: false });

            res.status(200).json(accountDetails || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addTransactionCategory: async (req, res) => {
        try {
            const { name, description } = req.body;

            const newTransactionCategory = new TransactionCategory({
                name,
                description,
            });

            await newTransactionCategory.save();

            res.status(200).json({
                newTransactionCategory,
                message: "new account created successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllCategory: async (req, res) => {
        try {
            const accountDetails = await TransactionCategory.find({ isDeleted: false });

            res.status(200).json(accountDetails || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
