const router = require("express").Router();

const {
    getB2bHotelHomeData,
    getSuggestedHotels,
} = require("../../controllers/hotel/hotelsControllers");

router.get("/home", getB2bHotelHomeData);
router.get("/suggested-hotels", getSuggestedHotels);

module.exports = router;
