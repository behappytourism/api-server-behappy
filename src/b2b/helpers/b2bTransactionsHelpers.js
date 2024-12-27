const xl = require("excel4node");
const { Types } = require("mongoose");

const { B2BTransaction } = require("../models");
const { formatDate } = require("../../utils");

module.exports = {
    getB2bTransactions: async ({
        skip = 0,
        limit = 10,
        b2bRole,
        transactionNo,
        paymentProcessor,
        dateFrom,
        dateTo,
        resellerId,
        agentCode,
    }) => {
        try {
            const filters1 = {};
            const filters2 = {};

            if (resellerId && resellerId !== "") {
                filters1.reseller = Types.ObjectId(resellerId);
            }

            if (transactionNo && transactionNo !== "") {
                filters1.transactionNo = Number(transactionNo);
            }

            if (paymentProcessor && paymentProcessor !== "") {
                filters1.paymentProcessor = paymentProcessor;
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filters1.$and = [
                    { dateTime: { $gte: new Date(dateFrom) } },
                    { dateTime: { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filters1["dateTime"] = { $gte: new Date(dateFrom) };
            } else if (dateTo && dateTo !== "") {
                filters1["dateTime"] = { $lte: new Date(dateTo) };
            }

            if (b2bRole && b2bRole !== "") {
                filters2["reseller.role"] = b2bRole;
            }

            if (agentCode && agentCode !== "") {
                filters2["reseller.agentCode"] = Number(agentCode);
            }

            const transactions = await B2BTransaction.aggregate([
                { $match: filters1 },
                {
                    $lookup: {
                        from: "resellers",
                        localField: "reseller",
                        foreignField: "_id",
                        as: "reseller",
                    },
                },
                {
                    $addFields: {
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                    },
                },
                {
                    $match: filters2,
                },
                {
                    $project: {
                        reseller: {
                            companyName: 1,
                            website: 1,
                            name: 1,
                            agentCode: 1,
                        },
                        paymentProcessor: 1,
                        product: 1,
                        dateTime: 1,
                        description: 1,
                        debitAmount: 1,
                        creditAmount: 1,
                        directAmount: 1,
                        closingBalance: 1,
                        dueAmount: 1,
                        b2bTransactionNo: 1,
                        remark: 1,
                    },
                },
                {
                    $sort: { dateTime: -1 },
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

    generateB2bTransactionsSheet: async ({
        skip = 0,
        limit = 10,
        b2bRole,
        transactionNo,
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

            if (resellerId && resellerId !== "") {
                filters1.reseller = Types.ObjectId(resellerId);
            }

            if (transactionNo && transactionNo !== "") {
                filters1.attractionTransactionNo = Number(transactionNo);
            }

            if (paymentProcessor && paymentProcessor !== "") {
                filters1.paymentProcessor = paymentProcessor;
            }

            if (status && status !== "") {
                filters1.status = status;
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filters1.$and = [
                    { dateTime: { $gte: new Date(dateFrom) } },
                    { dateTime: { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filters1["dateTime"] = { $lte: new Date(dateFrom) };
            } else if (dateTo && dateTo !== "") {
                filters1["dateTime"] = { $lte: new Date(dateTo) };
            }

            if (b2bRole && b2bRole !== "") {
                filters2["reseller.role"] = b2bRole;
            }

            if (agentCode && agentCode !== "") {
                filters2["reseller.agentCode"] = Number(agentCode);
            }

            const transactions = await B2BTransaction.aggregate([
                { $match: filters1 },
                {
                    $lookup: {
                        from: "resellers",
                        localField: "reseller",
                        foreignField: "_id",
                        as: "reseller",
                    },
                },
                {
                    $addFields: {
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                    },
                },
                {
                    $match: filters2,
                },
                {
                    $project: {
                        reseller: {
                            companyName: 1,
                            website: 1,
                            name: 1,
                        },
                        paymentProcessor: 1,
                        product: 1,
                        dateTime: 1,
                        description: 1,
                        debitAmount: 1,
                        creditAmount: 1,
                        directAmount: 1,
                        closingBalance: 1,
                        dueAmount: 1,
                        b2bTransactionNo: 1,
                        remark: 1,
                    },
                },
                {
                    $sort: { dateTime: -1 },
                },
                {
                    $skip: Number(limit) * Number(skip),
                },
                {
                    $limit: Number(limit),
                },
            ]);

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet("Transactions");

            const titleStyle = wb.createStyle({
                font: {
                    bold: true,
                },
            });

            ws.cell(1, 1).string("Transaction No").style(titleStyle);
            ws.cell(1, 2).string("Reseller").style(titleStyle);
            ws.cell(1, 3).string("Reseller Email").style(titleStyle);
            ws.cell(1, 4).string("Product").style(titleStyle);
            ws.cell(1, 5).string("Payment Processor").style(titleStyle);
            ws.cell(1, 6).string("Date & Time").style(titleStyle);
            ws.cell(1, 7).string("Description").style(titleStyle);
            ws.cell(1, 8).string("Debit").style(titleStyle);
            ws.cell(1, 9).string("Credit").style(titleStyle);
            ws.cell(1, 10).string("Direct").style(titleStyle);
            ws.cell(1, 11).string("Closing Balance").style(titleStyle);
            ws.cell(1, 12).string("Due Amount").style(titleStyle);
            ws.cell(1, 13).string("Remark").style(titleStyle);

            for (let i = 0; i < transactions?.length; i++) {
                const transaction = transactions[i];

                ws.cell(i + 2, 1).string(transaction?.transactionNo?.toString() || "N/A");
                ws.cell(i + 2, 2).string(transaction?.reseller?.companyName || "N/A");
                ws.cell(i + 2, 3).string(transaction?.reseller?.email);
                ws.cell(i + 2, 4).string(transaction?.product);
                ws.cell(i + 2, 5).string(transaction?.paymentProcessor || "N/A");
                ws.cell(i + 2, 6).string(
                    transaction?.dateTime ? formatDate(transaction?.dateTime) : "N/A"
                );
                ws.cell(i + 2, 7).string(transaction?.description || "N/A");
                ws.cell(i + 2, 8).number(Number(transaction?.debitAmount) || 0);
                ws.cell(i + 2, 9).number(Number(transaction?.creditAmount) || 0);
                ws.cell(i + 2, 10).number(Number(transaction?.directAmount) || 0);
                ws.cell(i + 2, 11).number(Number(transaction?.closingBalance) || 0);
                ws.cell(i + 2, 12).number(Number(transaction?.dueAmount) || 0);
                ws.cell(i + 2, 13).string(transaction?.remark || "N/A");
            }

            wb.write(`transactions.xlsx`, res);
        } catch (err) {
            throw err;
        }
    },
};
