const router = require("express").Router();

const {
    addNewCompanyBankAccount,
    deleteCompanyBankAccount,
    getAllCompanyBankAccounts,
    updateCompanyBankAccountInfo,
    getSingelCompanyBankAccount,
    getAllCompanyBankNames,
} = require("../../controllers/global/admCompanyBankInfoController");

router.post("/add", addNewCompanyBankAccount);
router.patch("/update/:id", updateCompanyBankAccountInfo);
router.delete("/delete/:id", deleteCompanyBankAccount);
router.get("/all", getAllCompanyBankAccounts);
router.get("/all/names", getAllCompanyBankNames);
router.get("/single/:id", getSingelCompanyBankAccount);

module.exports = router;
