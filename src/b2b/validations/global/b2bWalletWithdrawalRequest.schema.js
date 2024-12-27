const Joi = require("joi");

const b2bWalletWithdrawalRequestSchema = Joi.object({
    isNewBankAccount: Joi.boolean().required(),
    bankDeatilId: Joi.when("isNewBankAccount", {
        is: Joi.boolean().valid(false),
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    isoCode: Joi.when("isNewBankAccount", {
        is: Joi.boolean().valid(true),
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    bankName: Joi.when("isNewBankAccount", {
        is: Joi.boolean().valid(true),
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    branchName: Joi.when("isNewBankAccount", {
        is: Joi.boolean().valid(true),
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    accountHolderName: Joi.when("isNewBankAccount", {
        is: Joi.boolean().valid(true),
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    accountNumber: Joi.when("isNewBankAccount", {
        is: Joi.boolean().valid(true),
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    ifscCode: Joi.string().allow("", null),
    ibanCode: Joi.string().allow("", null),
    amount: Joi.number().required().min(1),
});

module.exports = { b2bWalletWithdrawalRequestSchema };
