const router = require("express").Router();

const {
    getAllTransferOrders,
    singleTransferB2bCancellation,
    approveTransferOrderB2bCancellationRequest,
    singleTransferB2cCancellation,
    approveTransferOrderB2cCancellationRequest,
} = require("../../controllers/transfer/admVehicleTypeOrderCOntroller");

router.get("/list/all", getAllTransferOrders);
router.patch("/b2b/:orderId/cancel/:transferId", singleTransferB2bCancellation);
router.patch(
    "/b2b/approve/canel-request/:cancellationId",
    approveTransferOrderB2bCancellationRequest
);
router.patch("/:orderId/cancel/:transferId", singleTransferB2cCancellation);
router.patch(
    "/b2b/approve/canel-request/:cancellationId",
    approveTransferOrderB2cCancellationRequest
);
module.exports = router;
