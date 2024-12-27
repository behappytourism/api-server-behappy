const router = require("express").Router();

const {
    addNewDriver,
    updateDriver,
    deleteDriver,
    getAllDrivers,
    getSingleDriver,
} = require("../../controllers/global/admDriversController");

router.post("/add", addNewDriver);
router.patch("/update/:id", updateDriver);
router.delete("/delete/:id", deleteDriver);
router.get("/all", getAllDrivers);
router.get("/single/:id", getSingleDriver);

module.exports = router;
