const router = require("express").Router();

const {
    upsertB2bHotelResellerSettings,
    getSingleResellerHotelSettings,
    clearB2bHotelResellerSettings,
} = require("../../controllers/hotel/admB2bHotelResellerSettingsController");

router.patch("/upsert", upsertB2bHotelResellerSettings);
router.patch("/clear/:resellerId", clearB2bHotelResellerSettings);
router.get("/single/:resellerId", getSingleResellerHotelSettings);

module.exports = router;
