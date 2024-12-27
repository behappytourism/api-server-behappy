const {
    listAllA2a,
    getA2aDate,
    listSingleA2a,
    singleA2aTicket,
} = require("../../controllers/a2a/b2bA2aController");
const { b2bAuth } = require("../../middlewares");

const router = require("express").Router();

router.get("/date", b2bAuth, getA2aDate);
router.post("/list/all", b2bAuth, listAllA2a);
router.post("/single/:id", b2bAuth, listSingleA2a);
router.get("/single/ticket/:id", b2bAuth, singleA2aTicket);

module.exports = router;
