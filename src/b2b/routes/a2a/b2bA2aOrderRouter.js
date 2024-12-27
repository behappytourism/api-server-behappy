const router = require("express").Router();

const {
    createA2aOrder,
    completeA2aOrder,
    cancelA2aOrder,
    listAllOrders,
    singleA2aOrderPassenger,
    singleA2aOrder,
    downloadSingleTicket,
    downloadMultipleTicket,
    updateSingleOrder,
    downloadSummary,
} = require("../../controllers/a2a/b2bA2aOrderController");
const { b2bAuth } = require("../../middlewares");

router.post("/create", b2bAuth, createA2aOrder);
router.post("/complete/:orderId", b2bAuth, completeA2aOrder);
router.get("/all", b2bAuth, listAllOrders);
router.get("/single/:orderId", b2bAuth, singleA2aOrder);
router.get("/:orderId/single/:passengerId", b2bAuth, singleA2aOrderPassenger);
router.patch("/:orderId/cancel/:passengerId", b2bAuth, cancelA2aOrder);
router.get("/ticket/:orderId/single/:passengerId", b2bAuth, downloadSingleTicket);
router.get("/single/ticket/:orderId", downloadMultipleTicket);
router.patch("/:orderId/update/:passengerId", b2bAuth, updateSingleOrder);
router.get("/download/summary", b2bAuth, downloadSummary);

module.exports = router;
