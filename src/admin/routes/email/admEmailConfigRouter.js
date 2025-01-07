const router = require("express").Router();

const {
    getAllEmailConfigs,
    addNewEmailConfig,
    deleteEmailConfig,
    getSingleEmailConfig,
    updateEmailConfig,
    getAllEmailConfigsList,
} = require("../../controllers/email/admEmailConfigController");

router.get("/all", getAllEmailConfigs);
router.get("/single/:id", getSingleEmailConfig);
router.post("/add", addNewEmailConfig);
router.patch("/update/:id", updateEmailConfig);
router.delete("/delete/:id", deleteEmailConfig);
router.get("/list", getAllEmailConfigsList);

module.exports = router;
