const router = require("express").Router();

const {
    getSingleAttraction,
    getAllAttractions,
    getTimeSlot,
} = require("../../controllers/attraction/attractionsController");

router.get("/single/:slug", getSingleAttraction);
router.get("/all", getAllAttractions);
router.post("/timeslot", getTimeSlot);

module.exports = router;
