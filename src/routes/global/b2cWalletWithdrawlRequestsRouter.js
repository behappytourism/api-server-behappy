const router = require("express").Router();

const {
    walletWithdrawalRequestInitiate,
    walletWithdrawalReqauestComplete,
    getAllWalletWithdrawRequests,
} = require("../../controllers/global/b2cWalletWithdrawlRequestsController");
const userAuth = require("../../middlewares/userAuth");

router.post("/initiate", userAuth, walletWithdrawalRequestInitiate);
router.post("/complete/:id", userAuth, walletWithdrawalReqauestComplete);
router.get("/all", userAuth, getAllWalletWithdrawRequests);

module.exports = router;
