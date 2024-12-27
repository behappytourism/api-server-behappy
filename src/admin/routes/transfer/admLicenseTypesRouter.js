const router = require("express").Router();

const {
    addNewLicenseType,
    deleteLicenseType,
    getAllLicenseTypes,
    updateNewLicenseType,
} = require("../../controllers/transfer/admLicenseTypesController");

router.post("/add", addNewLicenseType);
router.patch("/update/:id", updateNewLicenseType);
router.delete("/delete/:id", deleteLicenseType);
router.get("/all", getAllLicenseTypes);

module.exports = router;
