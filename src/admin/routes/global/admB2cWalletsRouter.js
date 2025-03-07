const router = require("express").Router();

const {
    depositMoneyToB2cWalletAccount,
    onUpsertWalletCredit,
    removeMoneyFromB2cWallet,
    getAllWalletDeposits,
    getB2cWalletsStatistics,
    getSingleReseller,
    addUsedCreditToWallet,
    approveWalletWithdrawalRequest,
    getAllWalletDepositRequests,
    rejectWalletWithdrawalRequest,
    getAllWalletWithdrawals,
} = require("../../controllers/global/admB2cWalletsController");

router.post("/add-money", depositMoneyToB2cWalletAccount);
router.post("/remove-money", removeMoneyFromB2cWallet);
router.post("/add/used-credit", addUsedCreditToWallet);
router.patch("/upsert/credit", onUpsertWalletCredit);
router.get("/withdraw-request/all", getAllWalletDepositRequests);
router.patch("/withdraw-request/approve/:id", approveWalletWithdrawalRequest);
router.patch("/withdraw-request/reject/:id", rejectWalletWithdrawalRequest);
router.get("/withdrawals/all", getAllWalletWithdrawals);
router.get("/deposits/all", getAllWalletDeposits);
// router.get("/statistics", getB2cWalletsStatistics);
router.get("/single/:resellerId", getSingleReseller);

module.exports = router;
