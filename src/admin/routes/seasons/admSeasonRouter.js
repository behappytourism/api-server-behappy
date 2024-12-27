const {
    addSeasons,
    updateSeasons,
    listAllSeasons,
    deleteSeason,
    getSingleSeason,
} = require("../../controllers/seasons/admSeasonsController");

const router = require("express").Router();

router.get("/all", listAllSeasons);
router.post("/add", addSeasons);
router.patch("/update/:id", updateSeasons);
router.get("/single/:id", getSingleSeason);
router.delete("/delete/:id", deleteSeason);

module.exports = router;
