const Joi = require("joi");

const transactionSchema = Joi.object({
    date: Joi.string().required(),
    transactionFor: Joi.string().required().valid("b2b", "company").required(),
    transactionType: Joi.string().valid(
        "deposit",
        "withdraw",
        "deduct",
        "refund",
        "markup",
        "income",
        "expense"
    ),
    paymentProcessor: Joi.string().required().valid("cash-in-hand", "bank"),
    category: Joi.when("transactionFor", {
        is: "b2b",
        then: Joi.string()
            .allow("", null)
            .valid("a2a", "attraction", "flight", "hotel", "visa", "insurance"),
        otherwise: Joi.string().required(),
    }),
    resellerId: Joi.when("transactionFor", {
        is: "b2b",
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    resellerName: Joi.when("transactionFor", {
        is: "b2b",
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    account: Joi.when("transactionFor", {
        is: "company",
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    amount: Joi.number().required(),
    note: Joi.string().allow(""),
    transactionNumber: Joi.string().allow("", null),
});

module.exports = { transactionSchema };
