const Joi = require("joi");

const companyBankInfoSchema = Joi.object({
    countryCode: Joi.string().required(),
    bankName: Joi.string().required(),
    branchAddress: Joi.string().allow("", null),
    ifscCode: Joi.string().allow("", null),
    ibanCode: Joi.string().allow("", null),
    swiftCode: Joi.string().required(),
    accountNumber: Joi.string().required(),
    accountHolderName: Joi.string().required(),
});

module.exports = { companyBankInfoSchema };
