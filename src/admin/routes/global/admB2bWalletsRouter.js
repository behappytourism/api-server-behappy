const router = require("express").Router();

const {
    depositMoneyToB2bWalletAccount,
    onUpsertWalletCredit,
    removeMoneyFromB2bWallet,
    getAllWalletDeposits,
    getB2bWalletsStatistics,
    getSingleReseller,
    addUsedCreditToWallet,
    approveWalletWithdrawalRequest,
    getAllWalletDepositRequests,
    rejectWalletWithdrawalRequest,
    getAllWalletWithdrawals,
} = require("../../controllers/global/admB2bWalletsController");

router.post("/add-money", depositMoneyToB2bWalletAccount);
router.post("/remove-money", removeMoneyFromB2bWallet);
router.post("/add/used-credit", addUsedCreditToWallet);
router.patch("/upsert/credit", onUpsertWalletCredit);
router.get("/withdraw-request/all", getAllWalletDepositRequests);
router.patch("/withdraw-request/approve/:id", approveWalletWithdrawalRequest);
router.patch("/withdraw-request/reject/:id", rejectWalletWithdrawalRequest);
router.get("/withdrawals/all", getAllWalletWithdrawals);
router.get("/deposits/all", getAllWalletDeposits);
router.get("/statistics", getB2bWalletsStatistics);
router.get("/single/:resellerId", getSingleReseller);

module.exports = router;
