const router = require("express").Router();

const {
    getAllWalletDepositRequests,
    approveWalletDepositRequest,
    cancelWalletDepositRequest,
} = require("../../controllers/global/admB2bWalletDepositRequestsController");

router.get("/all", getAllWalletDepositRequests);
router.post("/:requestId/approve", approveWalletDepositRequest);
router.post("/:requestId/cancel", cancelWalletDepositRequest);

module.exports = router;
