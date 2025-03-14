const xl = require("excel4node");
const { Types } = require("mongoose");
const { B2CTransaction } = require("../models");

module.exports = {
    getB2cTransactions: async ({
        skip = 0,
        limit = 10,
        b2bRole,
        transactionNo,
        paymentProcessor,
        dateFrom,
        dateTo,
        userId,
        agentCode,
    }) => {
        try {
            const filters1 = {};
            const filters2 = {};

            if (userId && user !== "") {
                filters1.user = Types.ObjectId(userId);
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

            const transactions = await B2CTransaction.aggregate([
                { $match: filters1 },
                {
                    $lookup: {
                        from: "users",
                        localField: "users",
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
                        paymentProcessor: 1,
                        product: 1,
                        dateTime: 1,
                        description: 1,
                        debitAmount: 1,
                        creditAmount: 1,
                        directAmount: 1,
                        closingBalance: 1,
                        dueAmount: 1,
                        b2cTransactionNo: 1,
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

   
};
