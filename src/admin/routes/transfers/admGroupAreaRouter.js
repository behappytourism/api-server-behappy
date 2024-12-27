const router = require("express").Router();

const {
    getAreas,
    addGroupArea,
    listAllGroups,
    singleGroupArea,
    updateGroupArea,
    deleteGroupArea,
} = require("../../controllers/transfers/admGroupArea");

router.get("/area", getAreas);
router.post("/add", addGroupArea);
router.get("/all", listAllGroups);
router.get("/single/:id", singleGroupArea);
router.patch("/update/:id", updateGroupArea);
router.delete("/delete/:id", deleteGroupArea);

module.exports = router;
