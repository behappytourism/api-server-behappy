const router = require("express").Router();

const {
    searchHotelAvailability,
    getSingleRoomRateWithDetails,
    getSearchSuggestions,
    getSingleHotelAvailability,
    getSingleHotelDetails,
} = require("../../controllers/hotel/admHotelAvailabilitiesController");

router.get("/search/suggestions", getSearchSuggestions);
// router.post("/search", b2bAuth, searchHotelAvailability);
router.post("/single/search", getSingleHotelAvailability);
// router.get("/single/:hotelId", b2bAuth, getSingleHotelDetails);
// router.post("/booking/room-rate", b2bAuth, getSingleRoomRateWithDetails);

module.exports = router;
