const router = require("express").Router();

const {
    initateAffiliateRedeemRequest,
    completeAffiliateRedeemRequest,
    getUserRedeemRequests,
    getReedemInitalData,
} = require("../../controllers/affiliate/affiliateRedeemController");
const { userAuth } = require("../../middlewares");

router.post("/initiate", userAuth, initateAffiliateRedeemRequest);
router.patch("/create/:redeemId", userAuth, completeAffiliateRedeemRequest);
router.get("/all", userAuth, getUserRedeemRequests);
router.get("/initial", userAuth, getReedemInitalData);

module.exports = router;
