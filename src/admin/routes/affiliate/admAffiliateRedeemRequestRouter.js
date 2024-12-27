const router = require("express").Router();

const {
    listAllRedeemRequest,
    onRedeemRequestCheck,
} = require("../../controllers/affiliate/admAffiliateRedeemRequestController");

router.get("/all", listAllRedeemRequest);
router.patch("/status", onRedeemRequestCheck);

module.exports = router;
