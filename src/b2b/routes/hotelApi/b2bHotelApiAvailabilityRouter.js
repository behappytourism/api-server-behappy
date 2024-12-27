const router = require("express").Router();

const {
    searchHotelAvailability,
    searchSingleHotelAvailability,
    getHotelSingleDetails,
} = require("../../controllers/hotelApi/b2bHotelApiAvailabilitiesController");
const { apiAccess } = require("../../middlewares");

const hotelAccessMiddleware = apiAccess("Hotel");

router.post("/search", hotelAccessMiddleware, searchHotelAvailability);
// router.get("/single/:hotelId", hotelAccessMiddleware, getHotelSingleDetails);
router.post("/single/search", hotelAccessMiddleware, searchSingleHotelAvailability);

module.exports = router;
