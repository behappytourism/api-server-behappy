const {
    getAllSubAgentMarkupTransferVehciles,
    getAllSubAgentMarkupTransfers,
    upsertB2bSubAgentTransferMarkup,
} = require("../../controllers/transfer/b2bSubAgentTransferMarkup");
const { b2bAuth } = require("../../middlewares");

const router = require("express").Router();

router.get("/get-all-transfer", b2bAuth, getAllSubAgentMarkupTransfers);
router.get(
    "/get-all-vehicle/:transferId/:resellerId",
    b2bAuth,
    getAllSubAgentMarkupTransferVehciles
);
router.post("/update-single-transfer-profile", b2bAuth, upsertB2bSubAgentTransferMarkup);
// router.post("/update-all-transfer-profile/:id", updateAllTransferProfile);
// router.post("/update-transfer-profile/:id", updateTransferProfile);

module.exports = router;
