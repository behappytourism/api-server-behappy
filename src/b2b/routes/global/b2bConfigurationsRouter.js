const router = require("express").Router();

const { b2bResellerAuth } = require("../../middlewares");
const {
    updateSubAgentAccess,
    getSubAgentConfig,
} = require("../../controllers/global/b2bConfigurationsController");

router.post("/sub-agent/update", b2bResellerAuth, updateSubAgentAccess);
router.get("/sub-agent/:subAgentId", b2bResellerAuth, getSubAgentConfig);

module.exports = router;
