const router = require("express").Router();

const {
    getApiAttractionAllDestinations,
    getAllApiAttractionsList,
    getAllApiAttractionCategories,
    getAllApiAttractionActivitiesPrice,
    getB2bAttractionApiTimeSlots,
} = require("../../controllers/attractionApi/b2bApiAttractionController");
const { apiAccess } = require("../../middlewares");

const attractionAccessMiddleware = apiAccess("Attraction");

router.get("/destinations", getApiAttractionAllDestinations);
router.get("/categories", getAllApiAttractionCategories);
router.get("/attractions", attractionAccessMiddleware, getAllApiAttractionsList);
router.post("/attractions/price", getAllApiAttractionActivitiesPrice);
router.post("/time-slots", attractionAccessMiddleware, getB2bAttractionApiTimeSlots);

module.exports = router;
