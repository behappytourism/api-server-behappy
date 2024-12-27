const router = require("express").Router();

const {
    getTermsAndConditions,
    getPrivacyAndPolicies,
} = require("../../controllers/global/b2cFrontendControllers");

router.get("/terms-and-conditions", getTermsAndConditions);
router.get("/privacy-and-policies", getPrivacyAndPolicies);

module.exports = router;
