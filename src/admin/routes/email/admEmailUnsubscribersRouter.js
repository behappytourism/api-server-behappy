const router = require("express").Router();

const {
    updateEmailUnsubscriber,
    getAllEmailUnsubscriber,
    addEmailUnsubscriber,
    deleteEmailUnsubscribe,
} = require("../../controllers/email/admEmailUnsubscribeController");

router.post("/add", addEmailUnsubscriber);
router.patch("/update/:id", updateEmailUnsubscriber);
router.get("/all", getAllEmailUnsubscriber);
router.delete("/delete/:id", deleteEmailUnsubscribe);

module.exports = router;
