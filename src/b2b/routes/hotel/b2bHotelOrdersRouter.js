const router = require("express").Router();

const { b2bAuth } = require("../../middlewares");
const {
    createB2bHotelOrder,
    completeB2bHotelOrder,
    getSingleB2bsAllHotelOrders,
    getSingleHotelOrderB2b,
    cancelB2bHotelOrder,
    downloadHotelOrderVoucher,
    downloadHotelOrderInvoice,
    completeB2bHotelOrderWithCcAvenue,
    completeB2bHotelOrderPayLater,
    hotelOrderInitiatePayment,
    hotelOrderCompleteCcAvenuePayment,
    hotelOrderCompleteWalletPayment,
} = require("../../controllers/hotel/b2bHotelOrdersController");

router.post("/create", b2bAuth, createB2bHotelOrder);
router.post("/:orderId/complete", b2bAuth, completeB2bHotelOrder);
router.get("/all", b2bAuth, getSingleB2bsAllHotelOrders);
router.get("/single/:orderId", b2bAuth, getSingleHotelOrderB2b);
router.post("/cancel/:orderId", b2bAuth, cancelB2bHotelOrder);
router.get("/voucher/:orderId", b2bAuth, downloadHotelOrderVoucher);
router.get("/invoice/:orderId", b2bAuth, downloadHotelOrderInvoice);
router.post("/ccavenue/capture", completeB2bHotelOrderWithCcAvenue);

router.post("/complete/pay-later", b2bAuth, completeB2bHotelOrderPayLater);
router.post("/payments/initiate", b2bAuth, hotelOrderInitiatePayment);
router.post("/payments/wallet/capture/:paymentId", b2bAuth, hotelOrderCompleteWalletPayment);
router.post("/payments/ccavenue/capture", hotelOrderCompleteCcAvenuePayment);

module.exports = router;
