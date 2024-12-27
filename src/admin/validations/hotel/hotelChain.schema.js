const Joi = require("joi");

const hotelChainSchema = Joi.object({
    chainCode: Joi.string().required(),
    chainName: Joi.string().required(),
    hotelGroup: Joi.string().allow("", null),
});

module.exports = { hotelChainSchema };
