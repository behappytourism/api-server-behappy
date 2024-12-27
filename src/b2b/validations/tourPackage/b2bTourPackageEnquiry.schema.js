const Joi = require("joi");

const b2bTourPackageEnquirySchema = Joi.object({
    tourPackageId: Joi.string().required(),
    noOfAdults: Joi.number().required().min(1).precision(0),
    noOfChildren: Joi.number().required().min(0).precision(0),
    departureDate: Joi.date().required(),
    remarks: Joi.string().allow("", null),
});

module.exports = { b2bTourPackageEnquirySchema };
