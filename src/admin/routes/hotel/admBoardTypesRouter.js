const router = require("express").Router();

const {
    getHotelBoardTypes,
    addHotelBoardType,
    getSingleBoardType,
    deleteBoardType,
    updateHotelBoardType,
    getAllBoardTypes,
} = require("../../controllers/hotel/admBoardTypesController");

router.get("/all/:hotelId", getHotelBoardTypes);
router.get("/all", getAllBoardTypes);
router.get("/single/:id", getSingleBoardType);
router.post("/add", addHotelBoardType);
router.delete("/delete/:id", deleteBoardType);
router.patch("/update/:id", updateHotelBoardType);

module.exports = router;
