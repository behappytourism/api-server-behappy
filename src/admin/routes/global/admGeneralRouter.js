const router = require("express").Router();

const {
    getGeneralData1,
    getGeneralData2,
} = require("../../controllers/global/admGeneralController");

router.get("/1", getGeneralData1);
router.get("/2", getGeneralData2);

module.exports = router;
