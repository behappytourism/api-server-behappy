const Joi = require("joi");

const voucherV2Schema = Joi.object({
    referenceNumber: Joi.string().required(),
    passengerName: Joi.string().required(),
    noOfAdults: Joi.number().required().min(0),
    noOfChildren: Joi.number().required().min(0),
    childrenAges: Joi.array().items(Joi.number()),
    hotels: Joi.array().items({
        hotelId: Joi.string().required(),
        confirmationNumber: Joi.string().allow("", null),
        checkInDate: Joi.date().required(),
        checkInNote: Joi.string().allow("", null),
        checkOutDate: Joi.date().required(),
        checkOutNote: Joi.string().allow("", null),
        roomDetails: Joi.string().allow("", null),
        noOfRooms: Joi.string().allow("", null),
    }),
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
        _id: Joi.string().allow("", null),
        date: Joi.date().required(),
        tourItems: Joi.array().items({
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
            _id: Joi.string().allow("", null),
            randId: Joi.string().allow("", null),
            pickupVehicle: Joi.string().allow("", null),
            pickupDriver: Joi.string().allow("", null),
            returnVehicle: Joi.string().allow("", null),
            returnDriver: Joi.string().allow("", null),
            qtnTransfers: Joi.array().items({
                vehicleType: Joi.string().required(),
                count: Joi.number().required().min(1).precision(0),
                _id: Joi.string().allow("", null),
            }),
        }),
    }),
    departureDate: Joi.date().allow("", null),
    departureNote: Joi.string().allow("", null),
    termsAndConditions: Joi.string().required(),
    quotationId: Joi.string().allow("", null),
});

const updateVoucherTourTransferSchema = Joi.object({
    voucherId: Joi.string().required(),
    tourId: Joi.string().required(),
    pickupVehicle: Joi.string().required(),
    pickupDriver: Joi.string().required(),
    pickupBufferTime: Joi.number().required().min(0),
    returnVehicle: Joi.string().allow("", null),
    returnDriver: Joi.string().allow("", null),
    returnBufferTime: Joi.number().required().min(0),
    transferType: Joi.string().required().allow("pickup-drop", "disposal"),
    vehicleSource: Joi.string().required().allow("in-house", "out-source"),
});

module.exports = { voucherV2Schema, updateVoucherTourTransferSchema };
