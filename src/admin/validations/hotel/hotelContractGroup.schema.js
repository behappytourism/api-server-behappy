const Joi = require("joi");

const hotelContractGroupSchema = Joi.object({
    contractName: Joi.string().required(),
    contractCode: Joi.string().required(),
    hotel: Joi.string().required(),
});

module.exports = { hotelContractGroupSchema };
