const Joi = require("joi");

const b2bWalletDepositRequestSchema = Joi.object({
    amount: Joi.number().required().min(1),
    companyBankId: Joi.string().required(),
    referenceNumber: Joi.string().required(),
    remark: Joi.string().allow("", null),
});

module.exports = { b2bWalletDepositRequestSchema };
