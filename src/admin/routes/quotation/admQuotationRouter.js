const router = require("express").Router();
const {
    createQuotation,
    updateQuotation,
    getAllQuotations,
    getSingleQuotationDetails,
    getSingleAmendment,
    confirmQuotationAmendment,
    getEmailAmendment,
    getSingleConfirmedQuotationData,
    getAllConfirmedQuotations,
} = require("../../controllers/quotation/admQuotationController");

router.post("/create", createQuotation);
router.patch("/update/:quotationNumber", updateQuotation);
router.get("/all", getAllQuotations);
router.get("/single/:quotationNumber", getSingleQuotationDetails);
router.get("/amendment/:id", getSingleAmendment);
router.get("/amendment/email/:id", getEmailAmendment);
router.get("/confirmed/single/:qtnId", getSingleConfirmedQuotationData);
router.get("/confirmed/all", getAllConfirmedQuotations);
router.patch("/confirm/:amendmentId", confirmQuotationAmendment);

module.exports = router;
