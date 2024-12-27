const router = require("express").Router();

const {
    upsertB2bClientFlightMarkup,
    listB2bClientFlightMarkup,
} = require("../../controllers/flight/b2bFlightMarkupController");
const { b2bAuth } = require("../../middlewares");

router.patch("/upsert", b2bAuth, upsertB2bClientFlightMarkup);
// router.delete("/delete/:id",b2bAuth , deleteB2bClientVisaMarkup);
router.get("/list", b2bAuth, listB2bClientFlightMarkup);

module.exports = router;
