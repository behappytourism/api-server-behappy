const router = require("express").Router();

const {
    addVehicleCategory,
    deleteVehicleCategory,
    getAllVehicleCategories,
    updateVehicleCategory,
    getSingleCatVehicleTypes,
} = require("../../controllers/transfer/admVehicleCategoriesController");

router.post("/add", addVehicleCategory);
router.get("/all", getAllVehicleCategories);
router.patch("/update/:id", updateVehicleCategory);
router.delete("/delete/:id", deleteVehicleCategory);
router.get("/single/:id/vehicle-type", getSingleCatVehicleTypes);

module.exports = router;
