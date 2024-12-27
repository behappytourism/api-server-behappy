const router = require("express").Router();

const {
    getB2bHotelHomeData,
    getSuggestedHotels,
    getOttilaHotels,
} = require("../../controllers/hotel/b2bHotelsControllers");
const { b2bAuth } = require("../../middlewares");

router.get("/home", b2bAuth, getB2bHotelHomeData);
router.get("/suggested-hotels", b2bAuth, getSuggestedHotels);
router.post("/ottila-test-hotels", b2bAuth, getOttilaHotels);

module.exports = router;
