const router = require("express").Router();

const {
    listAllEnquiry,
    listAllSummery,
    confirmBooking,
    downloadSummary,
    cancelA2aBooking,
    confirmA2aBooking,
} = require("../../controllers/a2a/admA2aOrderController");

router.patch("/:orderId/confirm/:passengerId", confirmBooking);
router.get("/enquiry/all", listAllEnquiry);
router.get("/summary/all", listAllSummery);
router.get("/download/summary", downloadSummary);
router.patch("/:orderId/cancel", cancelA2aBooking);
router.patch("/:orderId/confirm", confirmA2aBooking);

module.exports = router;
