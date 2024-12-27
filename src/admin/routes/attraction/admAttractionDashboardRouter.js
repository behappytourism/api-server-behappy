const router = require("express").Router();

const {
    getAttractionDashbaordData,
} = require("../../controllers/attraction/admAttractionDashboardController");

router.get("/", getAttractionDashbaordData);

module.exports = router;
