const Joi = require("joi");
const mongoose = require("mongoose");

const attractionsStandAloneSchema = Joi.object({
    title: Joi.string().required(),
    attractions: Joi.array().items().optional(),
    description: Joi.string().required(),
    images: Joi.array().optional(),
    shortDesc: Joi.string().required(),
});

const attractionsStandAloneUpdateSchema = Joi.object({
    title: Joi.string().required(),
    attractions: Joi.array().items().optional(),
    description: Joi.string().required(),
    images: Joi.array().optional(),
    initialImg: Joi.array().optional(),
    shortDesc: Joi.string().required(),
});

module.exports = {
    attractionsStandAloneSchema,
    attractionsStandAloneUpdateSchema,
};
