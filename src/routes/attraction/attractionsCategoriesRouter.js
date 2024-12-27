const router = require("express").Router();

const {
    getAllCategories,
} = require("../../controllers/attraction/attractionsCategoriesController");

router.get("/all", getAllCategories);

module.exports = router;
