const router = require("express").Router();

const {
    upsertB2cSettings,
    getFrontendSettings,
} = require("../../controllers/frontend/b2cFrontendSettingsController");

router.patch("/upsert", upsertB2cSettings);
router.get("/", getFrontendSettings);

module.exports = router;
