const router = require("express").Router();

const {
    listAffiliateSettings,
    updateAffiliateSettings,
} = require("../../controllers/affiliate/admAffiliateSettingsController");

router.get("/list", listAffiliateSettings);
router.post("/upsert", updateAffiliateSettings);

module.exports = router;
