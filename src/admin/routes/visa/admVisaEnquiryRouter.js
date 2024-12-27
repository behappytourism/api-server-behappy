const router = require("express").Router();

const { listAllVisaEnquiry } = require("../../controllers/visa/admVIsaEnquiryController");

router.get("/all", listAllVisaEnquiry);

module.exports = router;
