const router = require("express").Router();

const {
    createB2cOrder,
    captureCCAvenueOrderPayment,
    getAllOrders,
    getSingleOrder,
    downloadOrderInvoice,
    getSingleB2cAllOrdersSheet,
    cancelB2cOrder,
    completeB2cOrder,
} = require("../../controllers/order/orderController");
const { userAuthOrNot, userAuth } = require("../../middlewares");

router.post("/create", userAuthOrNot, createB2cOrder);
router.post("/complete", userAuth, completeB2cOrder);
router.post("/ccavenue/capture", captureCCAvenueOrderPayment);
router.get("/list/all", userAuth, getAllOrders);
router.get("/single/:id", getSingleOrder);
router.get("/invoice/:orderId", downloadOrderInvoice);
router.get("/all/sheet", getSingleB2cAllOrdersSheet);
router.patch("/cancel", cancelB2cOrder);

module.exports = router;
