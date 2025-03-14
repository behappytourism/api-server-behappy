const router = require("express").Router();

const { getAllB2cBanksList } = require("../../controllers/global/b2cBanksController");

router.get("/all", getAllB2cBanksList);

module.exports = router;
