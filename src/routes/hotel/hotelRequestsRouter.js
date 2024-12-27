const router = require("express").Router();

const { createNewB2bHotelRequest } = require("../../controllers/hotel/hotelRequestsController");

router.post("/new", createNewB2bHotelRequest);

module.exports = router;
