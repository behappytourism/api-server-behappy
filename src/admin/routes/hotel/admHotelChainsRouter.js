const router = require("express").Router();

const {
    addNewHotelChain,
    deleteHotelChain,
    getAllHotelChains,
    updateHotelChain,
} = require("../../controllers/hotel/admHotelChainsController");

router.post("/add", addNewHotelChain);
router.patch("/update/:id", updateHotelChain);
router.delete("/delete/:id", deleteHotelChain);
router.get("/all", getAllHotelChains);

module.exports = router;
