const router = require("express").Router();

const { b2bAuth } = require("../../middlewares");
const {
    promoCodeEligibiltyCheck,
    getPromoCodes,
} = require("../../controllers/promoCode/promoCodeController");

router.get("/list", b2bAuth, getPromoCodes);
router.post("/eligibilty/check", b2bAuth, promoCodeEligibiltyCheck);

// router.post("/booking/room-rate", b2bAuth, getSingleRoomRateWithDetails);

module.exports = router;
