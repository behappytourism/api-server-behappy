const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const { getDashboardDetails } = require("../../controllers/dashboard/admDashboardController");

router.get("/all", getDashboardDetails);
// router.get("/single/:id", getSingleAirline);
// router.post("/add", upload.single("image"), addNewAirline);
// router.patch("/update/:id", upload.single("image"), updateAirline);
// router.delete("/delete/:id", deleteAirline);

module.exports = router;
