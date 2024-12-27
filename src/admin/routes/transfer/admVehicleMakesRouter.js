const router = require("express").Router();

const {
    addNewVehicleMake,
    deleteVehicleMake,
    getAllVehicleMakes,
    updateVehicleMake,
    getSingleMakesModels,
} = require("../../controllers/transfer/admVehicleMakesController");

router.post("/add", addNewVehicleMake);
router.patch("/update/:id", updateVehicleMake);
router.delete("/delete/:id", deleteVehicleMake);
router.get("/all", getAllVehicleMakes);
router.get("/single/:id/models", getSingleMakesModels);

module.exports = router;
