const router = require("express").Router();

const {
    getAllB2bHotelOrders,
    getSingleB2bOrder,
    cancelB2bHotelOrder,
    confirmB2bHotelOrder,
    downloadB2bHotelOrderVoucher,
    approveHotelOrderCancellationRequest,
    getHotelExpiringPayLaterOrders,
    getHotelOrderCancellationRequests,
    getHotelOrderTopHotelsList,
    getHotelOrderTopResellers,
} = require("../../controllers/hotel/admHotelOrdersController");

router.get("/b2b/all", getAllB2bHotelOrders);
router.get("/b2b/single/:orderId", getSingleB2bOrder);
router.post("/b2b/confirm/:orderId", confirmB2bHotelOrder);
router.post("/b2b/cancel/:orderId", cancelB2bHotelOrder);
router.post("/b2b/cancel-request/approve/:cancellationId", approveHotelOrderCancellationRequest);
router.get("/b2b/voucher/:orderId", downloadB2bHotelOrderVoucher);
router.get("/b2b/all/pay-later/expiring", getHotelExpiringPayLaterOrders);
router.get("/b2b/all/cancellation-requests", getHotelOrderCancellationRequests);
router.get("/b2b/all/top-hotels", getHotelOrderTopHotelsList);
router.get("/b2b/all/top-resellers", getHotelOrderTopResellers);

module.exports = router;
