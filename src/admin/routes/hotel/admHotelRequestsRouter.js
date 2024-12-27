const router = require("express").Router();

const { getAllB2bHotelRequests } = require("../../controllers/hotel/admHotelRequestsController");

router.get("/b2b/all", getAllB2bHotelRequests);

module.exports = router;
