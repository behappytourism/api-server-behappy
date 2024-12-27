const router = require("express").Router();

const { upsertOttilaCountries } = require("../../controllers/hotel/admHotelOttilaControllers");

router.post("/upsert/countries", upsertOttilaCountries);

module.exports = router;
