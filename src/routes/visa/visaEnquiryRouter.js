const router = require("express").Router();

const { addVisaEnquiry } = require("../../controllers/visa/visaEnquiryController");
const { userAuthOrNot } = require("../../middlewares");

router.post("/add", userAuthOrNot, addVisaEnquiry);

module.exports = router;
