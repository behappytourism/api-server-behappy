const router = require("express").Router();

const {
    getAllFlightBookings,
    getSingleFlightBookingDetails,
    downloadSingleFlightTicket,
    getFlightBookingsInitialData,
} = require("../../controllers/flight/admFlightBookingsController");

router.get("/all", getAllFlightBookings);
router.get("/initial-data", getFlightBookingsInitialData);
router.get("/single/:bookingId", getSingleFlightBookingDetails);
router.get("/single/pdf/:bookingId", downloadSingleFlightTicket);

module.exports = router;
