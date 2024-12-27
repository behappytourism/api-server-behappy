const router = require("express").Router();

const {
    addNewHotelContractGroup,
    deleteHotelContractGroup,
    getSinglHotelContractGroups,
    updateHotelContractGroup,
    getSingleHotelAllContractGroupNames,
} = require("../../controllers/hotel/admHotelContractGroupsController");

router.post("/add", addNewHotelContractGroup);
router.patch("/update/:id", updateHotelContractGroup);
router.delete("/delete/:id", deleteHotelContractGroup);
router.get("/hotel/:hotelId", getSinglHotelContractGroups);
router.get("/all/names/hotel/:hotelId", getSingleHotelAllContractGroupNames);

module.exports = router;
