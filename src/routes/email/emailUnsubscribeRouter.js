const router = require("express").Router();

const {
    updateEmailUnsubscriber,
    updateEmailSubscriber,
} = require("../../controllers/email/emailUnsubscribeController");

router.post("/unsubscribe", updateEmailUnsubscriber);
router.post("/subscribe", updateEmailSubscriber);

// router.get("/privacy-and-policies", getPrivacyAndPolicies);

module.exports = router;
