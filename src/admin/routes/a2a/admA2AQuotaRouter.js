const { addA2aQuota, listA2aQuota, removeA2aQuota } = require("../../controllers/a2a/admA2aQuota");

const router = require("express").Router();

router.patch("/:ticketId/upsert", addA2aQuota);
router.delete("/:ticketId/delete/:resellerId", removeA2aQuota);
router.get("/:ticketId/all", listA2aQuota);

module.exports = router;
