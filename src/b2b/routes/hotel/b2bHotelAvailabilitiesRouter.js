const router = require("express").Router();

const { b2bAuth } = require("../../middlewares");
const {
    searchHotelAvailability,
    getSingleRoomRateWithDetails,
    getSearchSuggestions,
    getSingleHotelAvailability,
    getSingleHotelDetails,
} = require("../../controllers/hotel/b2bHotelAvailabilitiesController");

router.get("/search/suggestions", b2bAuth, getSearchSuggestions);
router.post("/search", b2bAuth, searchHotelAvailability);
router.post("/single/search", b2bAuth, getSingleHotelAvailability);
router.get("/single/:hotelId", b2bAuth, getSingleHotelDetails);
router.post("/booking/room-rate", b2bAuth, getSingleRoomRateWithDetails);

module.exports = router;
