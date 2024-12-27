const router = require("express").Router();

const {
    getEmailSettings,
    updateEmailSettings,
} = require("../../controllers/settings/admEmailSettingsController");

router.get("/", getEmailSettings);
router.patch("/update", updateEmailSettings);

module.exports = router;
