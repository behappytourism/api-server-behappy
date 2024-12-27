const router = require("express").Router();

const {
    listAffiliateReports,
    singleUserPointHistory,
} = require("../../controllers/affiliate/affiliateReportController");

router.get("/all", listAffiliateReports);
router.get("/single/user", singleUserPointHistory);

module.exports = router;
