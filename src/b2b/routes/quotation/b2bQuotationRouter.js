const router = require("express").Router();

const {
    createQuotation,
    getQuotationDetails,
    getQuotationsList,
    getSingleQuotationsAmendments,
    updateQuotation,
    getSingleAmendment,
    confirmQuotationAmendment,
} = require("../../controllers/quotation/b2bQuotationController");
const { b2bAuth } = require("../../middlewares");

router.post("/create", b2bAuth, createQuotation);
router.patch("/update/:quotationNumber", b2bAuth, updateQuotation);
router.get("/all", b2bAuth, getQuotationsList);
router.get("/amendments/:quotationNumber", b2bAuth, getSingleQuotationsAmendments);
router.get("/amendment/:id", b2bAuth, getSingleAmendment);
router.patch("/amendment/confirm/:amendmentId", b2bAuth, confirmQuotationAmendment);

module.exports = router;
