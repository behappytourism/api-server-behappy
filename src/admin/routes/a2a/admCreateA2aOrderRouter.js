const {
    listAllA2a,
    getA2aDate,
    listSingleA2a,
    singleA2aTicket,
    createA2aOrder,
    completeA2aOrder,
} = require("../../controllers/a2a/admCreateA2aOrderController");
const { b2bAuth } = require("../../middlewares");

const router = require("express").Router();

router.get("/date", getA2aDate);
router.post("/list/all", listAllA2a);
router.post("/single/:id/:resellerId", listSingleA2a);
router.post("/create/:resellerId", createA2aOrder);
router.post("/complete/:orderId", completeA2aOrder);
module.exports = router;
