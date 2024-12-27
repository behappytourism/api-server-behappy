const {
    getAllClientMarkupTransferVehciles,
    getAllClientMarkupTransfers,
    upsertB2bClientTransferMarkup,
} = require("../../controllers/transfer/b2bClientTransferMarkup");
const { b2bAuth } = require("../../middlewares");

const router = require("express").Router();

router.get("/get-all-transfer", b2bAuth, getAllClientMarkupTransfers);
router.get("/get-all-vehicle/:transferId", b2bAuth, getAllClientMarkupTransferVehciles);
router.post("/update-single-transfer-profile", b2bAuth, upsertB2bClientTransferMarkup);
// router.post("/update-all-transfer-profile/:id", updateAllTransferProfile);
// router.post("/update-transfer-profile/:id", updateTransferProfile);

module.exports = router;
