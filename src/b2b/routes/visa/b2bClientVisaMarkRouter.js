const router = require("express").Router();

const {
    upsertB2bClientVisaMarkup,
    deleteB2bClientVisaMarkup,
    listB2bClientVisaMarkup,
} = require("../../controllers/visa/b2bClientVisaMarkupController");
const { b2bAuth } = require("../../middlewares");

router.patch("/upsert", b2bAuth, upsertB2bClientVisaMarkup);
router.get("/list", b2bAuth, listB2bClientVisaMarkup);

module.exports = router;
