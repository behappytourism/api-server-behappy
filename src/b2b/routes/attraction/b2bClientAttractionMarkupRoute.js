const router = require("express").Router();

const {
    deleteB2bClientAttractionMarkup,
    upsertB2bClientAttractionMarkup,
    listAllAttractions,
} = require("../../controllers/attraction/b2bClientAttractionMarkupController");
const { b2bAuth } = require("../../middlewares");

router.patch("/upsert", b2bAuth, upsertB2bClientAttractionMarkup);
router.delete("/delete/:id", b2bAuth, deleteB2bClientAttractionMarkup);
router.get("/listall", b2bAuth, listAllAttractions);

module.exports = router;
