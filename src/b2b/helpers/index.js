const sendSubAgentRegistrationEmail = require("./sendSubAgentRegistrationEmail");
const sendWalletDeposit = require("./sendWalletDepositEmail");
const { createDubaiParkOrder } = require("./createDubaiParkOrder");
const {
    getTimeSlotWithRate,
    getTimeSlots,
    getTicketType,
    saveTicket,
    confirmTicket,
    orderDetails,
    generateBookingPdf,
    cancelBooking,
    testCredit,
    orderDetailsBooking,
} = require("./burjKhalifaApiHelper");

const { flightAvailabiltie } = require("./jazeeraAirwaysHelper");

const {
    flightAvailabilitySearch,
    getSingleTripDetails,
} = require("./b2bFlightHelper");

module.exports = {
    sendWalletDeposit,
    sendSubAgentRegistrationEmail,
    getTimeSlotWithRate,
    getTimeSlots,
    getTicketType,
    createDubaiParkOrder,
    flightAvailabilitySearch,
    getSingleTripDetails,
    saveTicket,
    confirmTicket,
    orderDetails,
    generateBookingPdf,
    cancelBooking,
    flightAvailabiltie,
    testCredit,
    orderDetailsBooking,
};
