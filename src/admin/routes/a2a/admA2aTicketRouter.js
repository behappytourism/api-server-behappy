const {
    addNewA2aTicket,
    getSingleA2ATicket,
    deleteA2aTicket,
    listAllA2aTicket,
    updateA2aTicket,
} = require("../../controllers/a2a/admA2aTicketController");

const router = require("express").Router();

router.post("/add", addNewA2aTicket);
router.get("/all/:id", listAllA2aTicket);
router.get("/single/:id", getSingleA2ATicket);
router.delete("/delete/:id", deleteA2aTicket);
router.patch("/update/:id", updateA2aTicket);

module.exports = router;
