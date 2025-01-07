const router = require("express").Router();

const {
    addNewEmailCampaignGroup,
    getAllEmailCampaignGroup,
    updateEmailCampaignGroup,
    deleteEmailCampaignGroup,
    getSingleEmailCampaignGroup,
} = require("../../controllers/email/admEmailCampaignGroupController");

router.get("/all", getAllEmailCampaignGroup);
router.get("/single/:id", getSingleEmailCampaignGroup);
router.post("/add", addNewEmailCampaignGroup);
router.patch("/update/:id", updateEmailCampaignGroup);
router.delete("/delete/:id", deleteEmailCampaignGroup);

module.exports = router;
