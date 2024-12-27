const router = require("express").Router();

const {
    getAllHotelProviders,
    addHotelProvider,
    updateHotelProvider,
} = require("../../controllers/hotel/admHotelProvidersController.js");

router.get("/all", getAllHotelProviders);
router.post("/add", addHotelProvider);
router.patch("/update/:id", updateHotelProvider);

module.exports = router;
