const router = require("express").Router();

const {
    getSingleExcursion,
    getAllExcursions,
    getAllTicketExcursions,
    updateExcursion,
    deleteExcursion,
    addNewExcursion,
} = require("../../controllers/quotation/admExcursionController");

router.get("/single/:activityId", getSingleExcursion);

router.patch("/update/:activityId", updateExcursion);
router.delete("/delete/:activityId", deleteExcursion);

module.exports = router;
