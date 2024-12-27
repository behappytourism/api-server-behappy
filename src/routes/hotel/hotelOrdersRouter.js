const router = require("express").Router();

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
} = require("../../controllers/hotel/hotelOrdersController");

router.post("/create", createB2bHotelOrder);
router.get("/all", getSingleB2bsAllHotelOrders);
router.get("/single/:orderId", getSingleHotelOrderB2b);
router.post("/cancel/:orderId", cancelB2bHotelOrder);
router.get("/voucher/:orderId", downloadHotelOrderVoucher);
router.get("/invoice/:orderId", downloadHotelOrderInvoice);
router.post("/ccavenue/capture", completeB2bHotelOrderWithCcAvenue);

// router.post("/complete/pay-later", completeB2bHotelOrderPayLater);
// router.post("/payments/initiate", hotelOrderInitiatePayment);
// router.post("/payments/wallet/capture/:paymentId", hotelOrderCompleteWalletPayment);
// router.post("/payments/ccavenue/capture", hotelOrderCompleteCcAvenuePayment);

module.exports = router;
