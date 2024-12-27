const router = require("express").Router();

const {
    addStarCategory,
    deleteStarCategory,
    getAllStarCategories,
    updateStarCategory,
} = require("../../controllers/hotel/admHotelStarCategoriesController");

router.post("/add", addStarCategory);
router.patch("/update/:id", updateStarCategory);
router.delete("/delete/:id", deleteStarCategory);
router.get("/all", getAllStarCategories);

module.exports = router;
