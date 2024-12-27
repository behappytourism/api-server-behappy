const router = require("express").Router();

const {
    addNewArea,
    deleteArea,
    getAllAreasByCities,
    updateArea,
} = require("../../controllers/global/admAreaControllers");

router.post("/add", addNewArea);
router.patch("/update/:id", updateArea);
router.delete("/delete/:id", deleteArea);
router.get("/city/:cityId", getAllAreasByCities);

module.exports = router;
