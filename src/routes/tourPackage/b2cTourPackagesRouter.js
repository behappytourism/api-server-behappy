const router = require("express").Router();

const {
    getAllTourPackages,
    getSingleTourPackage,
    searchTourPackage,
} = require("../../controllers/tourPackage/b2cTourPackagesController");

router.get("/all", getAllTourPackages);
router.get("/single/:slug", getSingleTourPackage);
router.get("/search", searchTourPackage);

module.exports = router;
