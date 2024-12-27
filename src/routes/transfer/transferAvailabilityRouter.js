const router = require("express").Router();

const {
    getSearchSuggestions,
    searchTransferAvailability,
} = require("../../controllers/transfer/transferController");

router.get("/search/suggestions", getSearchSuggestions);
router.post("/search", searchTransferAvailability);
// router.get("/single/:hotelId", b2bAuth, getSingleHotelDetails);
// router.post("/booking/room-rate", b2bAuth, getSingleRoomRateWithDetails);

module.exports = router;
