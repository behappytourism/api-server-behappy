const router = require("express").Router();

const {
    deleteB2bSubAgentAttractionMarkup,
    upsertB2bSubAgentAttractionMarkup,
    listAllAttractions,
} = require("../../controllers/attraction/b2bSubAgentAttractionMarkupController");
const { b2bAuth } = require("../../middlewares");

router.patch("/upsert", b2bAuth, upsertB2bSubAgentAttractionMarkup);
router.delete("/delete/:id", b2bAuth, deleteB2bSubAgentAttractionMarkup);
router.get("/listall/:subAgentId", b2bAuth, listAllAttractions);

module.exports = router;
