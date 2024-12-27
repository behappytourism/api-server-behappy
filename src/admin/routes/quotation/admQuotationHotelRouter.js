const router = require("express").Router();

const {
    getAllHotelsWithRoomTypes,
    getSingleRoomTypeRate,
    getQtnHotelAvailability,
    getSearchSuggestions,
    getHotelSearchSuggestions,
    getQtnHotelsList,
    getSingleHotelRoomTypesAndBoardTypes,
    getSingleRoomTypeEmptyRate,
} = require("../../controllers/quotation/admQuotationHotelController");

router.get("/availabilities/search/suggestions", getSearchSuggestions);
router.get("/availability/search/suggestions", getHotelSearchSuggestions);
router.get("/room-board/:hotelId", getSingleHotelRoomTypesAndBoardTypes);

router.post("/all", getQtnHotelsList);
router.post("/room-type/rate", getSingleRoomTypeRate);
router.post("/availability", getQtnHotelAvailability);
router.post("/room-type/rate/empty", getSingleRoomTypeEmptyRate);

module.exports = router;
