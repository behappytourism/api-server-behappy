const router = require("express").Router();

const {
    affiliateActivityListing,
    updateAffiliateActivityPoints,
    updateActiveStatus,
} = require("../../controllers/affiliate/admAffiliateActivityControllers");

router.get("/list", affiliateActivityListing);
router.patch("/upsert", updateAffiliateActivityPoints);
router.patch("/status", updateActiveStatus);

module.exports = router;
