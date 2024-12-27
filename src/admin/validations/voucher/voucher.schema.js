const Joi = require("joi");

const voucherSchema = Joi.object({
    passengerName: Joi.string().required(),
    noOfAdults: Joi.number().required().min(0),
    noOfChildren: Joi.number().required().min(0),
    childrenAges: Joi.array().items(Joi.number()),
    noOfInfants: Joi.number().required().min(0),
    infantAges: Joi.array().items(Joi.number()),
    hotelName: Joi.string().allow("", null),
    confirmationNumber: Joi.string().allow("", null),
    referenceNumber: Joi.string().required(),
    checkInDate: Joi.date().required(),
    checkInNote: Joi.string().allow("", null),
    checkOutDate: Joi.date().required(),
    checkOutNote: Joi.string().allow("", null),
    roomDetails: Joi.string().allow("", null),
    noOfRooms: Joi.string().allow("", null),
    buffetBreakfast: Joi.string().allow("", null),
    basisOfTransfer: Joi.string().required(),
    arrivalAirportId: Joi.string().allow("", null),
    contactName: Joi.string().required(),
    contactNumber: Joi.string().required(),
    printNote: Joi.string().required(),
    pagingName: Joi.string().required(),
    arrivalDate: Joi.date().allow("", null),
    arrivalNote: Joi.string().allow("", null),
    tours: Joi.array().items({
        tourName: Joi.string().required(),
        tourType: Joi.string()
            .required()
            .allow("regular", "arrival", "departure", "ticket-only", "half-day"),
        date: Joi.date().required(),
        pickupFrom: Joi.string().allow("", null),
        pickupTimeFrom: Joi.string().allow("", null),
        pickupTimeTo: Joi.string().allow("", null),
        returnTimeFrom: Joi.string().allow("", null),
        status: Joi.string().allow("", null, "not-booked", "booked"),
    }),
    departureDate: Joi.date().allow("", null),
    departureNote: Joi.string().allow("", null),
    termsAndConditions: Joi.string().required(),
});

module.exports = { voucherSchema };
