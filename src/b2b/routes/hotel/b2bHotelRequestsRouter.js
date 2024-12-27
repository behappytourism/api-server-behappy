const router = require("express").Router();

const { createNewB2bHotelRequest } = require("../../controllers/hotel/b2bHotelRequestsController");
const { b2bAuth } = require("../../middlewares");

router.post("/new", b2bAuth, createNewB2bHotelRequest);

module.exports = router;
