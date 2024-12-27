const router = require("express").Router();

const {
    addAccountNature,
    updateAccountNature,
    listAllAccountNatures,
    singleAccountNature,
    deleteAccountNature,
    getAllAccountNature,
} = require("../../controllers/accounts/admAccountNatureController");

router.post("/add", addAccountNature);
router.patch("/update/:id", updateAccountNature);
router.get("/all", listAllAccountNatures);
router.get("/single/:id", singleAccountNature);
router.delete("/delete/:id", deleteAccountNature);
router.get("/all/list", getAllAccountNature);

module.exports = router;
