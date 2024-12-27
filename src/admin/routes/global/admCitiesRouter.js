const router = require("express").Router();

const {
    addNewCity,
    deleteCity,
    getAllCities,
    updateCity,
    getAllCitiesByState,
    getAllCitiesByCountry,
} = require("../../controllers/global/admCitiesControllers");

router.post("/add", addNewCity);
router.patch("/update/:id", updateCity);
router.delete("/delete/:id", deleteCity);
router.get("/all", getAllCities);
router.get("/state/:stateId", getAllCitiesByState);
router.get("/country/:countryId", getAllCitiesByCountry);

module.exports = router;
