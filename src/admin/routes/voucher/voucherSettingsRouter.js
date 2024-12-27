const router = require("express").Router();

const {
    updateVoucherSettings,
    getVoucherSettings,
} = require("../../controllers/voucher/voucherSettingsController");

router.patch("/update", updateVoucherSettings);
router.get("/", getVoucherSettings);

module.exports = router;
