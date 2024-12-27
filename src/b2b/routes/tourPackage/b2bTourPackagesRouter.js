const router = require("express").Router();

const {
    getAllTourPackages,
    getSingleTourPackage,
} = require("../../controllers/tourPackage/b2bTourPackagesController");
const { b2bAuth } = require("../../middlewares");

router.get("/all", b2bAuth, getAllTourPackages);
router.get("/single/:id", b2bAuth, getSingleTourPackage);

module.exports = router;
