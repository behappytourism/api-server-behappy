const router = require("express").Router();

const { getAllB2bBanksList } = require("../../controllers/global/b2bBanksController");
const b2bAuth = require("../../middlewares/b2bAuth");

router.get("/all", b2bAuth, getAllB2bBanksList);

module.exports = router;
