const {
    getB2BAllVisaApplication,
    getB2BSingleVisaApplication,
    visaSingleTraveller,
    downloadVisaApplicationSummary,
} = require("../../controllers/visa/b2bVisaApplicationListController");
const { b2bAuth } = require("../../middlewares");

const router = require("express").Router();

router.get("/all", b2bAuth, getB2BAllVisaApplication);
router.get("/download/summary/all", b2bAuth, downloadVisaApplicationSummary);
router.get("/:id", b2bAuth, getB2BSingleVisaApplication);
router.get("/:applicationId/traveller/:travellerId", b2bAuth, visaSingleTraveller);

module.exports = router;
