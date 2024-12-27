const router = require("express").Router();

const {
    upsertB2bSubAgentVisaMarkup,
    listB2bSubAgentVisaMarkup,
} = require("../../controllers/visa/b2bSubAgentVisaMarkupController");
const { b2bResellerAuth } = require("../../middlewares");
const { b2bAuth } = require("../../middlewares");

router.patch("/upsert", b2bResellerAuth, upsertB2bSubAgentVisaMarkup);
router.get("/list/:subAgentId", b2bAuth, listB2bSubAgentVisaMarkup);

module.exports = router;
