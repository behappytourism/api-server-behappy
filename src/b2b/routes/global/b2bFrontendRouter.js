const router = require("express").Router();

const {
    getTermsAndConditions,
    getPrivacyAndPolicies,
    addGetInTouchMessage,
} = require("../../controllers/global/b2bFrontendController");
const b2bAuth = require("../../middlewares/b2bAuth");

router.get("/terms-and-conditions", getTermsAndConditions);
router.get("/privacy-and-policies", getPrivacyAndPolicies);
router.post("/get-in-touch", addGetInTouchMessage);

module.exports = router;
