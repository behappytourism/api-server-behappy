const Joi = require("joi");

const admAttractionReviewSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    rating: Joi.number().required(),
    attraction: Joi.string().required(),
    userName: Joi.string().required(),
    image: Joi.string().allow("", null),
});

module.exports = { admAttractionReviewSchema };
