const Joi = require("joi");

const admB2bWalletDepositSchema = Joi.object({
    resellerId: Joi.string().required(),
    amount: Joi.number().required().min(1),
    paymentProcessor: Joi.string().required().valid("ccavenue", "bank", "cash-in-hand"),
    referenceNo: Joi.when("paymentProcessor", {
        is: Joi.string().valid("bank"),
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    companyBankId: Joi.when("paymentProcessor", {
        is: Joi.string().valid("bank"),
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
});

module.exports = { admB2bWalletDepositSchema };
