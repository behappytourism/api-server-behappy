const router = require("express").Router();

const {
    updateEmailConfig,
    getAllEmailConfigs,
    deleteEmailConfig,
    getSingleEmailConfigs,
} = require("../../controllers/global/admEmailConfigController");

router.patch("/update", updateEmailConfig);
router.get("/all", getAllEmailConfigs);
router.get("/single/:id", getSingleEmailConfigs);
router.delete("/delete/:id", deleteEmailConfig);

module.exports = router;
