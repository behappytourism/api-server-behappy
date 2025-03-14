const { getB2cTransactions } = require("../../helpers/b2cTransactionsHelpers");
const { B2CWallet } = require("../../models");

module.exports = {
    getSingleB2cAllTransactions: async (req, res) => {
        try {
            const { result, skip, limit } = await getB2cTransactions({
                ...req.query,
                userId: req.user?._id,
            });

            res.status(200).json({ result, skip, limit });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    // getSingleB2bAllTransactionsSheet: async (req, res) => {
    //     try {
    //         await generateB2bTransactionsSheet({
    //             ...req.query,
    //             res,
    //             resellerId: req.reseller?._id,
    //             b2bRole: "",
    //             agentCode: "",
    //         });
    //     } catch (err) {
    //         sendErrorResponse(res, 500, err);
    //     }
    // },

    getB2cBalance: async (req, res) => {
        try {
            let wallet = await B2CWallet.findOne({
                user: req.user?._id,
            });

            if (!wallet) {
                wallet = new B2CWallet({
                    balance: 0,
                    user: req.user._id,
                });
            }

            // const transactions = await B2BTransaction.find({
            //     reseller: req.reseller._id,
            //     isPendingExpiry: true,
            //     pendingExpiry: { $lt: new Date() },
            //     status: "pending",
            //     transactionType: "markup",
            // }).lean();
            // for (let i = 0; i < transactions.length; i++) {
            //     const transaction = await B2BTransaction.findOneAndUpdate(
            //         {
            //             _id: transactions[0]?._id,
            //         },
            //         {
            //             status: "success",
            //         }
            //     );
            //     wallet.balance += transaction.amount;
            //     await wallet.save();
            // }

            // const pendingBalance = await B2BTransaction.aggregate([
            //     {
            //         $match: {
            //             isPendingExpiry: true,
            //             status: "pending",
            //             reseller: req.reseller?._id,
            //         },
            //     },
            //     {
            //         $group: {
            //             _id: null,
            //             totalAmount: { $sum: "$amount" },
            //         },
            //     },
            // ]);

            res.status(200).json({
                balance: wallet.balance || 0,
                // creditAmount: wallet.creditAmount || 0,
                // creditUsed: wallet.creditUsed || 0,
                // pendingBalance: 0,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

  
};
