const router = require("express").Router();

const { cancelB2cTransferOrder } = require("../../controllers/transfer/transferOrderController");

router.patch("/:orderId/cancel/:tranferId", cancelB2cTransferOrder);

module.exports = router;
