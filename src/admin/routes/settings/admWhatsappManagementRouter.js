const {
    addWhatsappManagment,
    getAllWhatsappManagement,
    changeManagementStatus,
} = require("../../controllers/whatsappSettings/whatsappManagmentController");

const router = require("express").Router();

router.post("/update", addWhatsappManagment);
router.get("/all", getAllWhatsappManagement);
router.patch("/status", changeManagementStatus);
// router.get("/confirm", confirmWhatsapp);

// router.post("/send-message", sendWhatsappMessage);

// router.delete("/logout", logoutWhatsappService);
// router.patch("/update/:id", updateEmailService);

module.exports = router;
