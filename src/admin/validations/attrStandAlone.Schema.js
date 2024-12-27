const Joi = require("joi")
const mongoose = require("mongoose")


const attractionsStandAloneSchema = Joi.object({
    title: Joi.string().required(),
    attractions: Joi.array().items(Joi.string().required()).min(1).required(),
    description: Joi.string().required(),
    images: Joi.array()
})

const attractionsStandAloneUpdateSchema = Joi.object({
    title: Joi.string().required(),
    attractions: Joi.array().items(Joi.string().required()).min(1).required(),
    description: Joi.string().required(),
    images: Joi.array(),
    initialImg: Joi.array()
})

module.exports = {
    attractionsStandAloneSchema,
    attractionsStandAloneUpdateSchema
}