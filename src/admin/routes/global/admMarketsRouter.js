const router = require("express").Router();

const {
    addNewMarket,
    deleteMarket,
    getAllMarkets,
    updateMarket,
} = require("../../controllers/global/admMarketsController");

router.post("/add", addNewMarket);
router.patch("/update/:id", updateMarket);
router.delete("/delete/:id", deleteMarket);
router.get("/all", getAllMarkets);

module.exports = router;
