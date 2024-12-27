const { sendErrorResponse } = require("../../../helpers");
const { B2bWalletWithdraw } = require("../../models");

module.exports = {
    getAllWithdrawals: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const withdrawals = await B2bWalletWithdraw.find({
                resellerId: req.reseller?._id,
            })
                .select(
                    "withdrawAmount fee status paymentProcessor referenceNo note b2bWalletWithdrawRefNo b2bBankDetails createdAt"
                )
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalWithdrawals = await B2bWalletWithdraw.find({
                resellerId: req.reseller?._id,
            }).count();

            res.status(200).json({
                totalWithdrawals,
                skip: Number(skip),
                limit: Number(limit),
                withdrawals,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
