const router = require("express").Router();

const {
    addAccountGlCode,
    updateAccountGlCode,
    listAllAccountGlCodes,
    singleAccountGlCode,
    deleteAccountGlCode,
} = require("../../controllers/accounts/admAccountGlCodeController");

router.post("/add", addAccountGlCode);
router.patch("/update/:id", updateAccountGlCode);
router.get("/all", listAllAccountGlCodes);
router.get("/single/:id", singleAccountGlCode);
router.delete("/delete/:id", deleteAccountGlCode);

module.exports = router;
