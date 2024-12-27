const router = require("express").Router();

const {
    createAttractionOrder,
    completeAttractionOrder,
    getSingleB2bAllOrders,
    getSingleB2bAllOrdersSheet,
    cancelAttractionOrder,
    getSingleAttractionOrder,
    getAttractionOrderTickets,
    getAttractionOrderSingleTickets,
    getTicketTypes,
    confirmTickets,
    getOrderDetails,
    generatePdf,
    cancelOrderRequest,
    testCreditRequest,
    getTimeSlot,
    getOrderDetailsBooking,
    generateAttractionInvoicePdf,
    completeB2bAttractionOrderWithTabby,
    cancelB2bAttractionActivityOrder,
} = require("../../controllers/attraction/b2bAttractionOrderController");
const { b2bAuth } = require("../../middlewares");

router.post("/create", b2bAuth, createAttractionOrder);
router.post("/complete/:orderId", b2bAuth, completeAttractionOrder);
router.post("/complete-tabby", completeB2bAttractionOrderWithTabby);
router.post("/cancel", b2bAuth, cancelAttractionOrder);

router.get("/all", b2bAuth, getSingleB2bAllOrders);
router.get("/all/sheet", b2bAuth, getSingleB2bAllOrdersSheet);
router.get("/single/:orderId", b2bAuth, getSingleAttractionOrder);
router.get("/:orderId/ticket/:activityId", getAttractionOrderTickets);
router.get("/:orderId/ticket/:activityId/single/:ticketNo", getAttractionOrderSingleTickets);
//INVOICE
router.get("/single/:orderId/invoice", b2bAuth, generateAttractionInvoicePdf);

router.post("/timeSlot", getTimeSlot);
router.post("/ticket-type", getTicketTypes);
router.post("/confirm-ticket", confirmTickets);
router.post("/order-details", getOrderDetails);
router.post("/order-details/booking", getOrderDetailsBooking);

router.post("/generate-pdf", generatePdf);
router.post("/cancel-booking", cancelOrderRequest);
router.post("/test", testCreditRequest);
router.patch("/:orderId/cancel/:activityId", cancelB2bAttractionActivityOrder);

module.exports = router;
