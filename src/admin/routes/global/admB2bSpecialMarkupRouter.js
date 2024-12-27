const router = require("express").Router();

const {
    upsertB2bAttractionMarkup,
    listSpecialMarkup,
    upsertB2bVisaMarkup,
    listVisaSpecialMarkup,
    upsertB2bA2aMarkup,
    updateB2bAttractionMarkup,
    updateB2bVisaMarkup,
    updateB2bAtoaMarkup,
} = require("../../controllers/global/adminB2BMarkupController");

router.patch("/activity-markup/add", upsertB2bAttractionMarkup);
router.get("/:resellerId", listSpecialMarkup);
router.patch("/visa/add", upsertB2bVisaMarkup);
router.patch("/a2a/add", upsertB2bA2aMarkup);
router.get("/visa/:resellerId", listVisaSpecialMarkup);

router.patch("/activity-markup/add-multiple", updateB2bAttractionMarkup);
router.patch("/atoa-markup/add-multiple", updateB2bAtoaMarkup);
router.patch("/visa-markup/add-multiple", updateB2bVisaMarkup);

module.exports = router;
