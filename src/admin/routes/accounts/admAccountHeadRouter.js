const router = require("express").Router();

const {
    addAccountHead,
    updateAccountHead,
    listAllAccountHeads,
    singleAccountHead,
    deleteAccountHead,
    getAllAccountHeads,
} = require("../../controllers/accounts/admAccountHeadController");

router.post("/add", addAccountHead);
router.patch("/update/:id", updateAccountHead);
router.get("/all", listAllAccountHeads);
router.get("/single/:id", singleAccountHead);
router.delete("/delete/:id", deleteAccountHead);
router.get("/all/list", getAllAccountHeads);

module.exports = router;
