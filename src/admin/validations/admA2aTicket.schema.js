const Joi = require("joi");

const addA2aTicketSchema = Joi.object({
    a2aReference: Joi.string().required(),
    airlineOnward: Joi.string().required(),
    airlineReturn: Joi.string().required(),
    airlineOnwardNo: Joi.string().required(),
    airlineReturnNo: Joi.string().required(),
    onwardDate: Joi.date().required(),
    returnDate: Joi.date().required(),
    onwardDurationHr: Joi.number().required(),
    onwardDurationMin: Joi.number().required(),
    returnDurationHr: Joi.number().required(),
    returnDurationMin: Joi.number().required(),
    takeOffTimeOnward: Joi.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .required(),
    takeOffTimeReturn: Joi.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .required(),
    landingTimeOnward: Joi.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .required(),

    landingTimeReturn: Joi.string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .required(),
    price: Joi.number().required(),
    infantPrice: Joi.number().required(),
    totalSeats: Joi.number().required(),
    pnrNo: Joi.string().required(),
    termsAndCond: Joi.string().required(),
    note: Joi.string().allow("", null),
    cancellationTime: Joi.number().required(),
});

module.exports = { addA2aTicketSchema };
