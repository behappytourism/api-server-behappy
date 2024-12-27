const router = require("express").Router();

const {
    addNewHotelPromotion,
    deleteHotelPromotion,
    updateHotelPromotion,
    getSingleHotelsPromotions,
    getSingleHotelPromotion,
    cloneHotelPromotion,
} = require("../../controllers/hotel/admHotelPromotionsController");

router.post("/add", addNewHotelPromotion);
router.patch("/update/:id", updateHotelPromotion);
router.delete("/delete/:id", deleteHotelPromotion);
router.get("/single/hotel/:hotelId", getSingleHotelsPromotions);
router.get("/single/:id", getSingleHotelPromotion);
router.post("/clone", cloneHotelPromotion);

module.exports = router;
