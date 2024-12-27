const router = require("express").Router();

const {
    addAccountGroup,
    updateAccountGroup,
    listAllAccountGroups,
    singleAccountGroup,
    deleteAccountGroup,
} = require("../../controllers/accounts/admAccountGroupController");

router.post("/add", addAccountGroup);
router.patch("/update/:id", updateAccountGroup);
router.get("/all", listAllAccountGroups);
router.get("/single/:id", singleAccountGroup);
router.delete("/delete/:id", deleteAccountGroup);

module.exports = router;
