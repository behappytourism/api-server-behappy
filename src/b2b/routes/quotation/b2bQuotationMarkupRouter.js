const router = require("express").Router();

const {
    upsertB2bClientQuotationMarkup,
    upsertB2bSubAgentQuotationMarkup,
    listQuotationMarkup,
} = require("../../controllers/quotation/b2bQuotationMarkupController");
const { b2bAuth } = require("../../middlewares");

router.patch("/sub-agent/upsert", b2bAuth, upsertB2bSubAgentQuotationMarkup);
router.patch("/client/upsert", b2bAuth, upsertB2bClientQuotationMarkup);
router.get("/list", b2bAuth, listQuotationMarkup);

module.exports = router;
