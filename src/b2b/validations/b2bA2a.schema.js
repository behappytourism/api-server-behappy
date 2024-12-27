const Joi = require("joi");

const A2alistAllSchema = Joi.object({
    date: Joi.date().required(),
});

module.exports = { A2alistAllSchema };
