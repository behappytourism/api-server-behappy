const router = require("express").Router();

const {
    upsertHotelAllocation,
    getAllocationAvailabilityChart,
} = require("../../controllers/hotel/admHotelAllocationsController");

router.post("/add", upsertHotelAllocation);
router.post("/availability", getAllocationAvailabilityChart);

module.exports = router;
