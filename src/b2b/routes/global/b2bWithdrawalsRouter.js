const router = require("express").Router();

const { getAllWithdrawals } = require("../../controllers/global/b2bWithdrawalsController");
const { b2bAuth } = require("../../middlewares");

router.get("/all", b2bAuth, getAllWithdrawals);

module.exports = router;
