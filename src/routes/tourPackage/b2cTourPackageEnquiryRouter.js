const router = require("express").Router();

const {
    createNewTourPackageEnquiry,
} = require("../../controllers/tourPackage/b2cTourPackageEnquiryControllers");

router.post("/create", createNewTourPackageEnquiry);

module.exports = router;
