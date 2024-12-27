const router = require("express").Router();

const {
    addVehicleType,
    deleteVehicleType,
    getAllVehicleTypes,
    updateVehicleType,
} = require("../../controllers/transfer/admVehicleTypesController");

router.get("/add", addVehicleType);
router.get("/update/:id", updateVehicleType);
router.get("/all", getAllVehicleTypes);
router.get("/delete/:id", deleteVehicleType);

module.exports = router;
