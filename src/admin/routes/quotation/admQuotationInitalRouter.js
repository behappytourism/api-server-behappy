const router = require("express").Router();

const {
    getAllInital,
    listVisaType,
    transferAvailable,
    getResellersList,
    getExcursionTransfer,
    listAllNationality,
    getHotelPricing,
    getExcursionsList,
    getGudesList,
} = require("../../controllers/quotation/admQuotationInitalController");

router.get("/all", getAllInital);
router.get("/visa-type/:id", listVisaType);
router.get("/nationality", listAllNationality);

router.post("/transfer", transferAvailable);
router.post("/transfer/excursion", getExcursionTransfer);
router.get("/resellers", getResellersList);
router.get("/excursions", getExcursionsList);
router.get("/guides", getGudesList);

module.exports = router;
