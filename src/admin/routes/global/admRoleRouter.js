const router = require("express").Router();

const {
    createNewAdminRole,
    updateAdminRole,
    deleteAdminRole,
    getAllRoles,
    getSingleAdminRole,
    getAllRoleNames,
    getSingleAdminRoleAdminList,
} = require("../../controllers/global/admRoleController");

router.post("/create", createNewAdminRole);
router.patch("/update/:id", updateAdminRole);
router.delete("/delete/:id", deleteAdminRole);
router.get("/all", getAllRoles);
router.get("/single/:id", getSingleAdminRole);
router.get("/single/:id", getSingleAdminRole);
router.get("/all/role-names", getAllRoleNames);
router.get("/admins/list/:roleId", getSingleAdminRoleAdminList);

module.exports = router;
