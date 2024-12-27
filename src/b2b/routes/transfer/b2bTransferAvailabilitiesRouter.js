const router = require("express").Router();

const { b2bAuth } = require("../../middlewares");
const {
    searchTransferAvailability,
    getSingleRoomRateWithDetails,
    getSearchSuggestions,
    getSingleHotelAvailability,
    getSingleHotelDetails,
    getBannaers,
} = require("../../controllers/transfer/transfersController");

router.get("/search/suggestions", getSearchSuggestions);
router.post("/search", searchTransferAvailability);
router.get("/banners", b2bAuth, getBannaers);
// router.get("/single/:hotelId", b2bAuth, getSingleHotelDetails);
// router.post("/booking/room-rate", b2bAuth, getSingleRoomRateWithDetails);

module.exports = router;
