const router = require("express").Router();

const { getAdminA2AStatistics } = require("../../controllers/a2a/admA2aStatisticsController");

router.get("/summary", getAdminA2AStatistics);

module.exports = router;
