const router = require("express").Router();

const {
    addNewEmailCampaign,
    getAllEmailCampaign,
    updateEmailCampaign,
    deleteEmailCampaign,
    getSingleEmailCampaign,
    emailCampaignPreviewData,
    emailCampaginTest,
    statusChangeEmailCampaign,
    emailCampaignView,
} = require("../../controllers/email/admEmailCampaignController");

router.get("/all/:id", getAllEmailCampaign);
router.get("/single/:id", getSingleEmailCampaign);
router.post("/add", addNewEmailCampaign);
router.patch("/update/:id", updateEmailCampaign);
router.delete("/delete/:id", deleteEmailCampaign);
router.patch("/status/:id", statusChangeEmailCampaign);
router.post("/preview", emailCampaignPreviewData);
router.post("/test", emailCampaginTest);
router.get("/single/view/:id", emailCampaignView);
// router.get("/single/view/:id", emailCampaignView);

module.exports = router;
