const router = require("express").Router();

const { getHotelDashboardData } = require("../../controllers/hotel/admHotelDashboardController");

router.get("/", getHotelDashboardData);

module.exports = router;
