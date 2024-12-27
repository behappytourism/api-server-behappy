const router = require("express").Router();

const {
    listVisa,
    listVisaType,
    listAllNationality,
} = require("../../controllers/visa/visaListController");

router.get("/all", listVisa);
router.get("/all/nationality", listAllNationality);
router.get("/type/:visaId/all/:nationalityId", listVisaType);

module.exports = router;
