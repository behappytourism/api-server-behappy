const router = require("express").Router();

const {
    getAllOrders,
    getSingleB2bOrder,
    getAllB2cOrdersSheet,
    confirmBooking,
    cancelBooking,
    updateDriverForOrder,
    getSingleResellerAttractionOrders,
    getB2bAllOrdersSheet,
    getSingleResellerAttractionOrdersSheet,
    getAllOrdersStatistics,
    getAllB2bAttractionOrders,
    getSingleB2bAttractionOrder,
    getAllB2cAttractionOrders,
    getSingleB2cAttractionOrder,
    getAllB2cOrders,
    getSingleB2cOrder,
    downloadB2bOrderInvoice,
    downloadB2cOrderInvoice,
    newOrderCount,
    orderViewStatusChange,
    getAllCancelledOrders,
    cancelB2bOrder,
    approveOrderB2bCancellationRequest,
    orderCancelStatusChange,
} = require("../../controllers/orders/admOrdersController");

router.get("/b2b/all", getAllOrders);
router.get("/b2b/single/:orderId", getSingleB2bOrder);

router.get("/b2c/all", getAllB2cOrders);
router.get("/b2c/single/:orderId", getSingleB2cOrder);
router.get("/b2b/invoice/:orderId", downloadB2bOrderInvoice);
router.get("/b2c/invoice/:orderId", downloadB2cOrderInvoice);

router.get("/count", newOrderCount);
router.patch("/count/:id", orderViewStatusChange);
router.patch("/cancellation/count/:id", orderCancelStatusChange);

router.get("/b2b/cancel/all", getAllCancelledOrders);

router.patch("/b2b/cancel/:orderId", cancelB2bOrder);
router.patch("/b2b/cancel-approval/:cancellationId", approveOrderB2bCancellationRequest);

// router.get("/b2c/all", getAllB2cAttractionOrders);
// router.get("/b2c/single/:orderId", getSingleB2cAttractionOrder);

// router.get("/orderItems/b2c/all", getAllB2cOrders);
// router.get("/orderItems/b2c/all/sheet", getAllB2cOrdersSheet);
// router.get("/orderItems/b2b/all", getAllB2bOrders);
// router.get("/orderItems/b2b/all/sheet", getB2bAllOrdersSheet);

// router.get("/b2b/reseller/:resellerId/all", getSingleResellerAttractionOrders);
// router.get("/b2b/reseller/:resellerId/all/sheet", getSingleResellerAttractionOrdersSheet);

// router.patch("/bookings/confirm", confirmBooking);
// router.patch("/bookings/cancel", cancelBooking);
// router.patch("/assign-driver", updateDriverForOrder);
// router.get("/statistics", getAllOrdersStatistics);

module.exports = router;
