const router = require("express").Router();

const {
    addAffiliateSettings,
    getAffiliationUserDetails,
    getAffiliateTermsAndPolicy,
    getAffilateAttractions,
    deleteAffiliate,
    getAffiliatePointHistory,
    addFinancialData,
    updateFinancialData,
    getSingleUserFinacialData,
} = require("../../controllers/affiliate/affiliateDetailsController");
const { userAuth } = require("../../middlewares");

router.get("/terms-and-policy", userAuth, getAffiliateTermsAndPolicy);
router.post("/add", userAuth, addAffiliateSettings);
router.get("/single/user", userAuth, getAffiliationUserDetails);
router.get("/attractions", userAuth, getAffilateAttractions);
router.get("/point/history", userAuth, getAffiliatePointHistory);
router.delete("/delete", userAuth, deleteAffiliate);
router.post("/financial-data/add", userAuth, addFinancialData);
router.patch("/update/financial-data/:id", userAuth, updateFinancialData);
router.get("/financial/list", userAuth, getSingleUserFinacialData);
module.exports = router;
