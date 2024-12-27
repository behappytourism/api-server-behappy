const router = require("express").Router();

const {
    walletDeposit,
    capturePaypalWalletDeposit,
    captureCCAvenueWalletPayment,
    captureRazorpayAttractionPayment,
    getAllDepositsList,
} = require("../../controllers/global/b2bWalletDepositController");

const { b2bAuth } = require("../../middlewares");

router.post("/deposit", b2bAuth, walletDeposit);
router.get("/deposit/all", b2bAuth, getAllDepositsList);
router.post("/paypal/capture", b2bAuth, capturePaypalWalletDeposit);
router.post("/razorpay/capture", b2bAuth, captureRazorpayAttractionPayment);
router.post("/ccavenue/capture", captureCCAvenueWalletPayment);

module.exports = router;
