const router = require("express").Router();

const {
    getAllInital,
    listVisaType,
    listAllNationality,
    getExcursionsList,
    getExcursionsSearchList,
} = require("../../controllers/quotation/b2bQuotationInitialController");
const {
    getTransfer,
    getExcursionTransfer,
} = require("../../controllers/quotation/b2bQuotationTransferController");
const { b2bAuth } = require("../../middlewares");

router.get("/all", getAllInital);
router.get("/nationality", listAllNationality);

router.get("/visa-type/:id", b2bAuth, listVisaType);
router.post("/transfer", b2bAuth, getTransfer);
router.post("/excursion/transfer", b2bAuth, getExcursionTransfer);
router.get("/excursion/list", b2bAuth, getExcursionsList);
router.get("/excursion/search", b2bAuth, getExcursionsSearchList);

module.exports = router;
