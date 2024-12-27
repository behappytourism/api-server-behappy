const router = require("express").Router();

const {
    addNewHotelGroup,
    deleteHotelGroup,
    getAllHotelGroupNames,
    getAllHotelGroups,
    updateHotelGroup,
} = require("../../controllers/hotel/hotelGroupsControllers");

router.post("/add", addNewHotelGroup);
router.patch("/update/:id", updateHotelGroup);
router.get("/all", getAllHotelGroups);
router.get("/all/names", getAllHotelGroupNames);
router.delete("/delete/:id", deleteHotelGroup);

module.exports = router;
