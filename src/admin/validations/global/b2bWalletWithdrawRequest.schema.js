const Joi = require("joi");

const approveB2bWalletWithdrawRequestSchema = Joi.object({
    paymentReferenceNo: Joi.string().required(),
    companyBankId: Joi.string().required(),
});

const rjectB2bWalletWithdrawRequestSchema = Joi.object({
    reason: Joi.string().required(),
});

module.exports = { approveB2bWalletWithdrawRequestSchema, rjectB2bWalletWithdrawRequestSchema };
