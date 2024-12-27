const xl = require("excel4node");
const { Types } = require("mongoose");

const { B2BTransaction } = require("../models");
const { formatDate } = require("../../utils");
const { CompanyTransaction } = require("../../models");

module.exports = {
    getCompanyTransactions: async ({
        skip = 0,
        limit = 10,
        b2bRole,
        transactionNo,
        transactionType,
        paymentProcessor,
        status,
        dateFrom,
        dateTo,
        resellerId,
        agentCode,
    }) => {
        try {
            const filters1 = {};
            const filters2 = {};

            if (transactionNo && transactionNo !== "") {
                filters1.transactionNumber = Number(transactionNo);
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

            const transactions = await CompanyTransaction.aggregate([
                { $match: filters1 },
                {
                    $lookup: {
                        from: "accountdetails",
                        localField: "account",
                        foreignField: "_id",
                        as: "account",
                    },
                },
                {
                    $lookup: {
                        from: "transactioncategories",
                        localField: "category",
                        foreignField: "_id",
                        as: "category",
                    },
                },

                {
                    $addFields: {
                        account: { $arrayElemAt: ["$account", 0] },
                        category: { $arrayElemAt: ["$category", 0] },
                    },
                },
                {
                    $match: filters2,
                },
                {
                    $project: {
                        account: {
                            accountName: 1,
                            accountNumber: 1,
                        },
                        category: {
                            name: 1,
                        },
                        transactionType: 1,
                        paymentProcessor: 1,
                        amount: 1,
                        status: 1,
                        createdAt: 1,
                        referenceNo: 1,
                        transactionNumber: 1,
                        note: 1,
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

            return {
                result: transactions[0],
                skip: Number(skip),
                limit: Number(limit),
            };
        } catch (err) {
            throw err;
        }
    },

    generateCompanyTransactionsSheet: async ({
        skip = 0,
        limit = 10,
        b2bRole,
        transactionNo,
        transactionType,
        paymentProcessor,
        status,
        dateFrom,
        dateTo,
        resellerId,
        res,
        agentCode,
    }) => {
        try {
            const filters1 = {};
            const filters2 = {};

            if (transactionNo && transactionNo !== "") {
                filters1.transactionNumber = Number(transactionNo);
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
                filters1["createdAt"] = { $lte: new Date(dateFrom) };
            } else if (dateTo && dateTo !== "") {
                filters1["createdAt"] = { $lte: new Date(dateTo) };
            }

            const transactions = await CompanyTransaction.aggregate([
                { $match: filters1 },
                {
                    $lookup: {
                        from: "accountdetails",
                        localField: "account",
                        foreignField: "_id",
                        as: "account",
                    },
                },
                {
                    $lookup: {
                        from: "transactioncategories",
                        localField: "category",
                        foreignField: "_id",
                        as: "category",
                    },
                },

                {
                    $addFields: {
                        account: { $arrayElemAt: ["$account", 0] },
                        category: { $arrayElemAt: ["$category", 0] },
                    },
                },
                {
                    $match: filters2,
                },
                {
                    $project: {
                        account: {
                            accountName: 1,
                            accountNumber: 1,
                        },
                        category: {
                            name: 1,
                        },
                        transactionType: 1,
                        paymentProcessor: 1,
                        amount: 1,
                        status: 1,
                        createdAt: 1,
                        referenceNo: 1,
                        transactionNumber: 1,
                        note: 1,
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

            console.log(transactions, "transactions");

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet("Orders");

            const titleStyle = wb.createStyle({
                font: {
                    bold: true,
                },
            });

            ws.cell(1, 1).string("Transaction No").style(titleStyle);
            ws.cell(1, 2).string("Account").style(titleStyle);
            ws.cell(1, 3).string("Account Number").style(titleStyle);
            ws.cell(1, 4).string("Date").style(titleStyle);
            ws.cell(1, 5).string("Category").style(titleStyle);

            ws.cell(1, 6).string("Transaction Type").style(titleStyle);
            ws.cell(1, 7).string("Payment Processor").style(titleStyle);
            ws.cell(1, 8).string("Amount").style(titleStyle);
            ws.cell(1, 9).string("Status").style(titleStyle);

            for (let i = 0; i < transactions?.length; i++) {
                const transaction = transactions[i];

                ws.cell(i + 2, 1).number(Number(transaction?.transactionNumber) || 0);
                ws.cell(i + 2, 2).string(transaction?.account?.accountName || "N/A");
                ws.cell(i + 2, 3).number(Number(transaction?.account?.accountNumber) || 0);
                ws.cell(i + 2, 4).string(
                    transaction?.createdAt ? formatDate(transaction?.createdAt) : "N/A"
                );
                ws.cell(i + 2, 5).string(transaction?.category?.name || "N/A");

                ws.cell(i + 2, 6).string(transaction?.transactionType || "N/A");
                ws.cell(i + 2, 7).string(transaction?.paymentProcessor || "N/A");
                ws.cell(i + 2, 8).number(Number(transaction?.amount) || 0);
                ws.cell(i + 2, 9).string(transaction?.status || "N/A");
            }

            wb.write(`FileName.xlsx`, res);
        } catch (err) {
            console.log(err);
            throw err;
        }
    },
};
