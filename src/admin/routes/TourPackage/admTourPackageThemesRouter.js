const router = require("express").Router();

const {
    addNewTourPackageTheme,
    deleteTourPackageTheme,
    getAllTourPackageThemes,
    updateTourPackageTheme,
} = require("../../controllers/tourPackage/admTourPackageThemesController");

router.post("/add", addNewTourPackageTheme);
router.patch("/update/:id", updateTourPackageTheme);
router.delete("/delete/:id", deleteTourPackageTheme);
router.get("/all", getAllTourPackageThemes);

module.exports = router;
