const router = require("express").Router();

const {
    flightAvailabilitySearch,
    getSingleFlightDetailsWithAncillary,
    addSelectedAncillaries,
    initiateFlightBooking,
    completeFlightBooking,
    addToCartFlight,
    getSingleBookingDetails,
    downloadSingleBookingTicket,
    getAllFlightBookingDetails,
    getFlightBookingsInitialData,
    getSingleFlightDetails,
    getFlightFaresByDates,
    downloadFlightBookingInvoice,
} = require("../../controllers/flight/b2bFlightController");
const { b2bAuth } = require("../../middlewares");

router.post("/search/availability", b2bAuth, flightAvailabilitySearch);
router.post("/addToCart", b2bAuth, addToCartFlight);
router.get("/details/:tbId", b2bAuth, getSingleFlightDetails);
router.get("/details/:tbId/ancillaries", b2bAuth, getSingleFlightDetailsWithAncillary);
router.post("/ancillaries/add", b2bAuth, addSelectedAncillaries);
router.post("/bookings/initiate", b2bAuth, initiateFlightBooking);
router.post("/bookings/complete", b2bAuth, completeFlightBooking);
router.get("/bookings/:bookingId", b2bAuth, getSingleBookingDetails);
router.get("/bookings/pdf/:bookingId", b2bAuth, downloadSingleBookingTicket);
router.get("/bookings/list/all", b2bAuth, getAllFlightBookingDetails);
router.get("/bookings/list/initial-data", b2bAuth, getFlightBookingsInitialData);
router.get("/fares-by-date", b2bAuth, getFlightFaresByDates);
router.get("/bookings/invoice/:bookingId", b2bAuth, downloadFlightBookingInvoice);

module.exports = router;
