const router = require("express").Router();

const {
    addNewVehicleTrim,
    deleteVehicleTrim,
    getAllVehicleTrims,
    updateVehicleTrim,
} = require("../../controllers/transfer/admVehicleTrimController");

router.post("/add", addNewVehicleTrim);
router.patch("/update/:id", updateVehicleTrim);
router.delete("/delete/:id", deleteVehicleTrim);
router.get("/all", getAllVehicleTrims);

module.exports = router;
