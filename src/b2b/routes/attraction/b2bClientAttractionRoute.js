const router = require("express").Router();

const {
    getSingleAttraction,
    getAllAttractions,
    listAllAttractions,
    getTimeSlot,
    getBannaers,
} = require("../../controllers/attraction/b2bClientAttractionController");
const { b2bAuth } = require("../../middlewares");

router.get("/single/:id", b2bAuth, getSingleAttraction);
router.get("/all", b2bAuth, getAllAttractions);
router.post("/timeslot", b2bAuth, getTimeSlot);
router.get("/banners", getBannaers);
module.exports = router;
