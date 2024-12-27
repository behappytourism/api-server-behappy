const router = require("express").Router();

const {
    createB2bApiAttractionOrder,
    completeB2bApiAttractionOrder,
    getAllB2bApiAttractionOrders,
    getSingleB2bApiAttractionOrder,
    downloadB2bApiAttractionSingleOrderItemTickets,
} = require("../../controllers/attractionApi/b2bApiAttractionOrderController");
const { apiAccess } = require("../../middlewares");

const attractionAccessMiddleware = apiAccess("Attraction");

router.post("/create", attractionAccessMiddleware, createB2bApiAttractionOrder);
router.post(
    "/complete/:referenceNumber",
    attractionAccessMiddleware,
    completeB2bApiAttractionOrder
);
router.get("/all", attractionAccessMiddleware, getAllB2bApiAttractionOrders);
router.get("/single/:referenceNumber", attractionAccessMiddleware, getSingleB2bApiAttractionOrder);
router.get(
    "/tickets/:referenceNumber/item/:orderItemId",
    attractionAccessMiddleware,
    downloadB2bApiAttractionSingleOrderItemTickets
);

module.exports = router;
