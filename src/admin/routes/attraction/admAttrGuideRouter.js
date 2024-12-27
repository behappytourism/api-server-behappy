const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const {
    addGuide,
    listGuide,
    editGuide,
    getSingleGuide,
    deleteGuide,
} = require("../../controllers/attraction/admAttrGuideController");
router.post("/add", addGuide);
router.get("/all", listGuide);
router.patch("/update/:id", editGuide);
router.get("/single/:id", getSingleGuide);

router.delete("/delete/:id", deleteGuide);

module.exports = router;
