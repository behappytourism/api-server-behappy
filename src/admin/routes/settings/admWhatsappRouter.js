const {
    addWhatsappUser,
    getAllEmailServices,
    deleteEmailService,
    updateEmailService,
    sendWhatsappMessage,
    getAllWhatsappDetails,
    reloadWhatsapp,
    confirmWhatsapp,
    logoutWhatsappService,
} = require("../../controllers/whatsappSettings/whatsappSettingController");

const router = require("express").Router();

router.get("/all", getAllWhatsappDetails);
router.post("/add", addWhatsappUser);
router.get("/reload", reloadWhatsapp);
router.get("/confirm", confirmWhatsapp);

router.post("/send-message", sendWhatsappMessage);

router.delete("/logout", logoutWhatsappService);
// router.patch("/update/:id", updateEmailService);

module.exports = router;
