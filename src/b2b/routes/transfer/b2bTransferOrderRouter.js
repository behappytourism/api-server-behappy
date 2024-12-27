const router = require("express").Router();

const { b2bAuth } = require("../../middlewares");
const {
    createTransferBooking,
    completeTransferOrder,
    getAllTransferOrders,
    completeTransferOrderWithCcAvenue,
    getSingleTransfer,
    downloadTransferOrderInvoice,
    downloadTransferTicket,
    cancelB2bTransferOrder,
} = require("../../controllers/transfer/transferOrderController");

router.post("/create", b2bAuth, createTransferBooking);
router.post("/complete", b2bAuth, completeTransferOrder);
router.post("/ccavenue/capture", completeTransferOrderWithCcAvenue);

router.get("/list/all", b2bAuth, getAllTransferOrders);
router.get("/single/:id", b2bAuth, getSingleTransfer);
router.get("/invoice/:orderId", b2bAuth, downloadTransferOrderInvoice);

router.get("/ticket/:orderId", downloadTransferTicket);
router.patch("/:orderId/cancel/:transferId", cancelB2bTransferOrder);

module.exports = router;
