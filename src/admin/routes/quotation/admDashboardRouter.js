const { getDashboardData } = require("../../controllers/quotation/admDashboardController");

const router = require("express").Router();

router.get("", getDashboardData);

module.exports = router;
