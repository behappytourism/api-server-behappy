const {
    getAllB2BTourPackageEnquiries,
} = require("../../controllers/tourPackage/admTourPackageEnquiriesController");

const router = require("express").Router();

router.get("/b2b/all", getAllB2BTourPackageEnquiries);

module.exports = router;
