const { AttractionTransaction } = require("../../../models");
const xl = require("excel4node");
const { Types } = require("mongoose");

const { formatDate } = require("../../../utils");

module.exports = {
    getAttractionTransaction: async ({
        skip = 0,
        limit = 10,
        b2bRole,
        transactionNo,
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

            if (resellerId && resellerId !== "") {
                filters1.reseller = Types.ObjectId(resellerId);
            }

            if (transactionNo && transactionNo !== "") {
                filters1.referenceNumber = transactionNo;
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

            const transactions = await AttractionTransaction.aggregate([
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
                    $lookup: {
                        from: "admins",
                        localField: "admin",
                        foreignField: "_id",
                        as: "admin",
                    },
                },

                {
                    $addFields: {
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                        admin: { $arrayElemAt: ["$admin", 0] },
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
                            email: 1,
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
                        cost: 1,
                        price: 1,
                        profit: 1,
                        activityName: 1,
                        activityId: 1,
                        attractionName: 1,
                        referenceNumber: 1,
                        admin: {
                            name: 1,
                            email: 1,
                        },
                        processId: 1,
                        referenceNumber: 1,
                        attractionTransactionNo: 1,
                    },
                },
                {
                    $sort: { dateTime: -1 },
                },
                {
                    $group: {
                        _id: null,
                        totalTransactions: { $sum: 1 },
                        totalProfit: { $sum: "$profit" },
                        totalCost: { $sum: "$cost" },
                        totalPrice: { $sum: "$price" },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalTransactions: 1,
                        totalProfit: 1,
                        totalCost: 1,
                        totalPrice: 1,
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

    generateAttractionTransactionsSheet: async ({
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
                filters1.referenceNumber = Number(transactionNo);
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

            const transactions = await AttractionTransaction.aggregate([
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
                    $lookup: {
                        from: "admins",
                        localField: "admin",
                        foreignField: "_id",
                        as: "admin",
                    },
                },
                {
                    $addFields: {
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                        admin: { $arrayElemAt: ["$admin", 0] },
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
                            email: 1,
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
                        cost: 1,
                        price: 1,
                        profit: 1,
                        activityName: 1,
                        activityId: 1,
                        attractionName: 1,
                        referenceNumber: 1,
                        admin: {
                            name: 1,
                            email: 1,
                        },
                        processId: 1,
                        referenceNumber: 1,
                        attractionTransactionNo: 1,
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

            ws.cell(1, 1).string("Reference No").style(titleStyle);
            ws.cell(1, 2).string("Reseller").style(titleStyle);
            ws.cell(1, 3).string("Reseller Email").style(titleStyle);
            ws.cell(1, 4).string("Product").style(titleStyle);
            ws.cell(1, 5).string("Admin").style(titleStyle);
            ws.cell(1, 6).string("Date & Time").style(titleStyle);
            ws.cell(1, 7).string("Description").style(titleStyle);
            ws.cell(1, 8).string("Cost").style(titleStyle);
            ws.cell(1, 9).string("Price").style(titleStyle);
            ws.cell(1, 10).string("Profit").style(titleStyle);
            ws.cell(1, 11).string("Closing Balance").style(titleStyle);
            ws.cell(1, 12).string("Remark").style(titleStyle);

            for (let i = 0; i < transactions?.length; i++) {
                const transaction = transactions[i];

                ws.cell(i + 2, 1).string(transaction?.referenceNumber?.toString() || "N/A");
                ws.cell(i + 2, 2).string(transaction?.reseller?.companyName || "N/A");
                ws.cell(i + 2, 3).string(transaction?.reseller?.email);
                ws.cell(i + 2, 4).string(transaction?.activityName);
                ws.cell(i + 2, 5).string(transaction?.admin?.name || "N/A");
                ws.cell(i + 2, 6).string(
                    transaction?.dateTime ? formatDate(transaction?.dateTime) : "N/A"
                );
                ws.cell(i + 2, 7).string(transaction?.description || "N/A");
                ws.cell(i + 2, 8).number(Number(transaction?.cost) || 0);
                ws.cell(i + 2, 9).number(Number(transaction?.price) || 0);
                ws.cell(i + 2, 10).number(Number(transaction?.profit) || 0);
                ws.cell(i + 2, 11).number(Number(transaction?.closingBalance) || 0);
                ws.cell(i + 2, 12).string(transaction?.remark || "N/A");
            }

            wb.write(`transactions.xlsx`, res);
        } catch (err) {
            throw err;
        }
    },
    
};
