const router = require("express").Router();

const {
    addNewAccommodationType,
    deleteAccommodationType,
    getAllAccommodationTypes,
    updateAccommodationType,
} = require("../../controllers/hotel/admAccommodationTypesController");

router.post("/add", addNewAccommodationType);
router.patch("/update/:accId", updateAccommodationType);
router.delete("/delete/:accId", deleteAccommodationType);
router.get("/all", getAllAccommodationTypes);

module.exports = router;
