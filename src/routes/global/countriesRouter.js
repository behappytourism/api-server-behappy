const router = require("express").Router();

const { getAllCountries } = require("../../controllers/global/countriesController");

router.get("/all", getAllCountries);

module.exports = router;
