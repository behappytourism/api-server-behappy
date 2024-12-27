const router = require("express").Router();

const {
    getQtnHotelsList,
    getSingleRoomTypeRate,
    getQtnHotelAvailability,
    getSearchSuggestions,
} = require("../../controllers/quotation/b2bQuotationHotelController");
const { b2bAuth } = require("../../middlewares");

router.post("/all", b2bAuth, getQtnHotelsList);
router.post("/room-type/rate", getSingleRoomTypeRate);
router.post("/availability", b2bAuth, getQtnHotelAvailability);
router.get("/search/suggestions", b2bAuth, getSearchSuggestions);

module.exports = router;
