const router = require("express").Router();

const {
    getAllCompanyBankAccounts,
} = require("../../controllers/global/b2bCompanyBankInfoController");
const { b2bAuth } = require("../../middlewares");

router.get("/all", b2bAuth, getAllCompanyBankAccounts);

module.exports = router;
