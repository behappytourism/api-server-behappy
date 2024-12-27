const router = require("express").Router();

const {
    addNewAddOn,
    deleteAddOn,
    updateAddOn,
    getSingleHotelAllAddOns,
    getSingleAddOns,
} = require("../../controllers/hotel/admAddonsController");

router.post("/add", addNewAddOn);
router.patch("/update/:id", updateAddOn);
router.delete("/delete/:id", deleteAddOn);
router.get("/all/hotel/:hotelId", getSingleHotelAllAddOns);
router.get("/single/:id", getSingleAddOns);

module.exports = router;
