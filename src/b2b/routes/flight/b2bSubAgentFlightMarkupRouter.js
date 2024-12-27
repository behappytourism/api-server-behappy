const router = require("express").Router();

const {
    upsertB2bSubAgentFlightMarkup,
    listB2bSubAgentFlightMarkup,
} = require("../../controllers/flight/b2bFlightMarkupController");
const { b2bAuth } = require("../../middlewares");

router.patch("/upsert", b2bAuth, upsertB2bSubAgentFlightMarkup);
router.get("/list/:subAgentId", b2bAuth, listB2bSubAgentFlightMarkup);

module.exports = router;
