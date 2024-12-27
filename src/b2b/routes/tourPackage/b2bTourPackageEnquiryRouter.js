const router = require("express").Router();

const {
    createNewTourPackageEnquiry,
    getAllTourPackageEnquiries,
} = require("../../controllers/tourPackage/b2bTourPackageEnquiryControllers");
const { b2bAuth } = require("../../middlewares");

router.post("/new", b2bAuth, createNewTourPackageEnquiry);
router.get("/all", b2bAuth, getAllTourPackageEnquiries);

module.exports = router;
