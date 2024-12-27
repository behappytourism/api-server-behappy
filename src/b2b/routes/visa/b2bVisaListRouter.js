const router = require("express").Router();

const {
    listVisaType,
    listAllCountry,
    listAllNationality,
    listAll,
} = require("../../controllers/visa/b2bVisaListController");
const { b2bAuth } = require("../../middlewares");

router.get("/country/all", listAllCountry);
router.get("/all/nationality", listAllNationality);
router.get("/type/:visaId/all/:nationalityId", b2bAuth, listVisaType);
router.get("/list", b2bAuth, listAll);

module.exports = router;
