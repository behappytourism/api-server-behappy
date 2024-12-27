const router = require("express").Router();

const {
    walletWithdrawalRequestInitiate,
    walletWithdrawalReqauestComplete,
    getAllWalletWithdrawRequests,
} = require("../../controllers/global/b2bWalletWithdrawlRequestsController");
const { b2bAuth } = require("../../middlewares");

router.post("/initiate", b2bAuth, walletWithdrawalRequestInitiate);
router.post("/complete/:id", b2bAuth, walletWithdrawalReqauestComplete);
router.get("/all", b2bAuth, getAllWalletWithdrawRequests);

module.exports = router;
