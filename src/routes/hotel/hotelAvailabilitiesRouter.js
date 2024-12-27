const router = require("express").Router();

const {
    searchHotelAvailability,
    getSingleRoomRateWithDetails,
    getSearchSuggestions,
    getSingleHotelAvailability,
    getSingleHotelDetails,
} = require("../../controllers/hotel/hotelAvailabilitiesController");

router.get("/search/suggestions", getSearchSuggestions);
router.post("/search", searchHotelAvailability);
router.post("/single/search", getSingleHotelAvailability);
router.get("/single/:hotelId", getSingleHotelDetails);
router.post("/booking/room-rate", getSingleRoomRateWithDetails);

module.exports = router;
