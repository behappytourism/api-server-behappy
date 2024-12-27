const router = require("express").Router();

const {
    doSubscribe,
    doUnsubscribe,
} = require("../../controllers/global/subscribersController");

router.post("/subscribe", doSubscribe);
router.post("/unsubscribe", doUnsubscribe);

module.exports = router;
