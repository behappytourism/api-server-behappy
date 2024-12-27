const router = require("express").Router();

const {
    addAdminB2bAccess,
    getAdmins,
    getAdminB2bAccess,
} = require("../../controllers/global/admB2bAccessController");

router.patch("/update/:reseller", addAdminB2bAccess);
router.get("/admins", getAdmins);
router.get("/b2b/:reseller", getAdminB2bAccess);

module.exports = router;
