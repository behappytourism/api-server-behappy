const router = require("express").Router();

const {
    getAllAttractions,
    getAllActivities,
    getSingleActivityDetails,
    getResellers,
    createAttractionOrder,
    completeAttractionOrder,
    getTimeSlot,
    getAllAttractionTransactions,
    getAttractionTransactionsSheet,
    getAttractionOrderTickets,
    getMarkup,
} = require("../../controllers/attraction/admAttractionCreateOrderController");

router.get("/list", getAllAttractions);
router.get("/activities/list/:id", getAllActivities);
router.get("/single/activity/:id/:resellerId", getSingleActivityDetails);
router.get("/list/resellers", getResellers);
router.post("/create/:resellerId", createAttractionOrder);
router.post("/complete/:orderId", completeAttractionOrder);
router.post("/timeslot/:resellerId", getTimeSlot);
router.get("/transactions/all", getAllAttractionTransactions);
router.get("/transactions/all/sheet", getAttractionTransactionsSheet);
router.get("/single/ticket/:orderId/:activityId", getAttractionOrderTickets);
router.get("/markup/:resellerId/:activityId", getMarkup);

module.exports = router;
