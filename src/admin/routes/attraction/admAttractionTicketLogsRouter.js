const router = require("express").Router();

const {
    addNewAttractionTicketLog,
} = require("../../controllers/attraction/admAttractionTicketLogsControlelr");

router.post("/", addNewAttractionTicketLog);

module.exports = router;
