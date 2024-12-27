const Joi = require("joi");

const vehicleCategorySchema = Joi.object({
    categoryName: Joi.string().required(),
});

module.exports = { vehicleCategorySchema };
