const router = require("express").Router();

const {
    upsertB2bSettings,
    getFrontendSettings,
} = require("../../controllers/frontend/b2bFrontendSettingsController");

router.patch("/upsert", upsertB2bSettings);
router.get("/", getFrontendSettings);

module.exports = router;
