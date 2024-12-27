const router = require("express").Router();

const {
    getAllB2cTransactions,
    getAllB2bTransactions,
    getSingleResellerTransactions,
    getB2bTransactionsSheet,
    getSingleResellerTransactionsSheet,
    getAllB2cTransactionsSheet,
    addNewTransaction,
    addTransactionCategory,
    addAccountDetails,
    listAllAccounts,
    listAllCategory,
    getAllCompanyTransactions,
    getCompanyTransactionsSheet,
} = require("../../controllers/global/admTransactionsController");

router.get("/b2c/all", getAllB2cTransactions);
router.get("/b2c/all/sheet", getAllB2cTransactionsSheet);
router.get("/b2b/all", getAllB2bTransactions);
router.get("/b2b/all/sheet", getB2bTransactionsSheet);
router.get("/b2b/reseller/:resellerId/all", getSingleResellerTransactions);
router.get("/b2b/reseller/:resellerId/all/sheet", getSingleResellerTransactionsSheet);
router.get("/company/all", getAllCompanyTransactions);
router.get("/company/all/sheet", getCompanyTransactionsSheet);

router.post("/add", addNewTransaction);
router.post("/add-account", addAccountDetails);
router.post("/add-category", addTransactionCategory);
router.get("/all/account", listAllAccounts);
router.get("/all/category", listAllCategory);

module.exports = router;
