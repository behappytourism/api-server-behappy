const router = require("express").Router();
const {
    listResellerQuotation,
    singleResellerQuotation,
} = require("../../controllers/quotation/admQuotationListingController");

router.get("/list", listResellerQuotation);
router.get("/list/:resellerId", singleResellerQuotation);

module.exports = router;
