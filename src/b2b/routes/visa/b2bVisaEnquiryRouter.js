const router = require("express").Router();

const { addVisaEnquiry } = require("../../controllers/visa/b2bVisaEnquireyController");
const { b2bAuth } = require("../../middlewares");

router.post("/add", b2bAuth, addVisaEnquiry);

module.exports = router;
