const router = require("express").Router();

const {
    addNewVehicle,
    deleteVehicle,
    getAllVehicles,
    updateVehicle,
    getVehiclesInitialData,
    getSingelVehicle,
} = require("../../controllers/transfer/admVehiclesController");

router.post("/add", addNewVehicle);
router.patch("/update/:id", updateVehicle);
router.delete("/delete/:id", deleteVehicle);
router.get("/all", getAllVehicles);
router.get("/initial-data", getVehiclesInitialData);
router.get("/single/:id", getSingelVehicle);

module.exports = router;
