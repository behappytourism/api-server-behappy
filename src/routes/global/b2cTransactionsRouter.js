const { getSingleB2cAllTransactions, getB2cBalance } = require("../../controllers/global/b2cTransationController");

const router = require("express").Router();

router.get("/all",  getSingleB2cAllTransactions);
// router.get("/all/sheet",  getSingleB2bAllTransactionsSheet);
router.get("/balance",  getB2cBalance);

module.exports = router;
