const Joi = require("joi");

const insuranceQuotation = Joi.object({
    generalData: Joi.object({
        plan: Joi.string().required(),
        residence: Joi.string().required(),
        destination: Joi.string().required(),
        travelFrom: Joi.string().required(),
        travelTo: Joi.string().required(),
        travelType: Joi.string().required(),
    }).required(),
    beneficiaryData: Joi.array()
        .items({
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            dateOfBirth: Joi.string().required(),
            gender: Joi.string().required().allow("male", "female"),
            passportNumber: Joi.string().required(),
        })
        .required()
        .min(1),
});

module.exports = {
    insuranceQuotation,
};
