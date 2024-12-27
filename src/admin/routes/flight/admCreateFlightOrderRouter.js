const {
    flightAvailabilitySearch,
    addToCartFlight,
    getSingleFlightDetails,
    getSingleFlightDetailsWithAncillary,
    initiateFlightBooking,
    addSelectedAncillaries,
    completeFlightBooking,
} = require("../../controllers/flight/admFlightCreateOrderController");

const router = require("express").Router();

router.post("/search/availability/:resellerId", flightAvailabilitySearch);
router.post("/addToCart", addToCartFlight);
router.get("/details/:tbId/:resellerId", getSingleFlightDetails);

router.get("/details/:tbId/ancillaries/:resellerId", getSingleFlightDetailsWithAncillary);
router.post("/ancillaries/add", addSelectedAncillaries);
router.post("/bookings/initiate/:resellerId", initiateFlightBooking);
router.post("/bookings/complete", completeFlightBooking);
module.exports = router;
