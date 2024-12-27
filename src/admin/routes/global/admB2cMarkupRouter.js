const router = require("express").Router();

const {
    updateB2cProfile,
    getB2cProfile,
} = require("../../controllers/global/admB2cMarkupController");

router.get("/", getB2cProfile);
router.post("/update", updateB2cProfile);

module.exports = router;
