const router = require("express").Router();

const {
    addFeaturedHotel,
    deleteFeaturedHotel,
    getAllFeaturedHotels,
    updateFeaturedHotel,
} = require("../../controllers/hotel/admFeaturedHotelsController");

router.post("/add", addFeaturedHotel);
router.patch("/update/:id", updateFeaturedHotel);
router.delete("/delete/:id", deleteFeaturedHotel);
router.get("/all", getAllFeaturedHotels);

module.exports = router;
