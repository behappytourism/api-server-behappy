const router = require("express").Router();

const {
    addState,
    deleteState,
    getAllStates,
    updateState,
    getStatesByCountry,
} = require("../../controllers/global/admStatesController");

router.post("/add", addState);
router.patch("/update/:id", updateState);
router.delete("/delete/:id", deleteState);
router.get("/all", getAllStates);
router.get("/country/:countryId", getStatesByCountry);

module.exports = router;
