const Joi = require("joi");

const userFinancialDataSchema = Joi.object({
    type: Joi.string().required().valid("bank", "crypto"),
    bankName: Joi.when("type", {
        is: ["bank"],
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    accountHolderName: Joi.when("type", {
        is: ["bank"],
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    ifsc: Joi.when("type", {
        is: "bank",
        then: Joi.when("countryCode", {
            is: Joi.not("UAE", "UK"), // Add more country codes if needed
            then: Joi.string().required(),
            otherwise: Joi.allow("", null),
        }),
        otherwise: Joi.allow("", null),
    }),
    iban: Joi.when("type", {
        is: "bank",
        then: Joi.when("countryCode", {
            is: "UAE",
            then: Joi.string().required(),
            otherwise: Joi.when("countryCode", {
                is: "UK",
                then: Joi.string().required(),
                otherwise: Joi.string().allow("", null),
            }),
        }),
        otherwise: Joi.string().allow("", null),
    }),
    accountNumber: Joi.when("type", {
        is: ["bank"],
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    network: Joi.when("type", {
        is: ["crypto"],
        then: Joi.string().required().valid("bep20-bsc", "eth", "tron"),
        otherwise: Joi.string().allow("", null),
    }),
    address: Joi.when("type", {
        is: ["crypto"],
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
    countryCode: Joi.when("type", {
        is: ["bank"],
        then: Joi.string().required(),
        otherwise: Joi.string().allow("", null),
    }),
});

module.exports = { userFinancialDataSchema };
