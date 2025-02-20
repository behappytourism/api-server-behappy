const router = require("express").Router();

const {
    getSingleAttractionTicket,
} = require("../../controllers/attraction/b2bAttractionTicketsController");
const { b2bAuth } = require("../../middlewares");

router.get("/single/:ticketId", b2bAuth, getSingleAttractionTicket);

module.exports = router;
