const Joi = require("joi");

const attractionTicketLogSchema = Joi.object({
    attraction: Joi.string().required(),
    activity: Joi.string().required(),
    ticketNumber: Joi.string().required(),
    loggedFrom: Joi.string().required().allow("tickets-list", "tickets-list-used", "orders-list"),
});

module.exports = { attractionTicketLogSchema };
