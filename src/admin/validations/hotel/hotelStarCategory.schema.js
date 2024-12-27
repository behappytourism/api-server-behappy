const Joi = require("joi");

const hotelStarCategorySchema = Joi.object({
    categoryCode: Joi.string().required(),
    categoryName: Joi.string().required(),
    order: Joi.number().required(),
});

module.exports = { hotelStarCategorySchema };
